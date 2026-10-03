import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import {prisma} from '../src/db/prisma.js';
import {env} from '../src/config/env.js';
import {authService} from '../src/modules/auth/auth.service.js';
import {examsService} from '../src/modules/exams/exams.service.js';
import {coursesService} from '../src/modules/courses/courses.service.js';
import {filesService} from '../src/modules/files/files.service.js';
import crypto from 'node:crypto';
import {privateStore} from '../src/storage/privateStore.js';
import {objectionsService} from '../src/modules/objections/objections.service.js';
import {descriptiveService} from '../src/modules/descriptive/descriptive.service.js';
import {submissionsService} from '../src/modules/submissions/submissions.service.js';
// Use the configured database, but roll back every verification change.
const originalTransaction=prisma.$transaction.bind(prisma);
const originalAuth=authService.getActiveUser;
const originalStore={...privateStore};
const bytes=new Map<string,Buffer>();
privateStore.write=async data=>{const key=crypto.randomUUID();bytes.set(key,data);return key};
privateStore.read=async key=>{const data=bytes.get(key);assert.ok(data);return data};
privateStore.remove=async key=>{bytes.delete(key)};
const pdf={buffer:Buffer.from('%PDF-1.7\nVerification file'),mimetype:'application/pdf',originalname:'verification.pdf'};
const rollback=new Error('Verification rollback');
const server=app.listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const address=server.address();assert.ok(address&&typeof address!=='string');
const base=`http://127.0.0.1:${address.port}/api/v1`;
try{
 await originalTransaction(async tx=>{
  const professor=await tx.user.findFirstOrThrow({where:{role:'PROFESSOR',isActive:true}});
  const admin=await tx.user.findFirstOrThrow({where:{role:'ADMIN',isActive:true}});
  const students=await tx.user.findMany({where:{role:'STUDENT',isActive:true},take:2});assert.equal(students.length,2);
  const actor={id:professor.id,role:'PROFESSOR' as const};
  const delegates=['exam','examParticipant','enrollment','professorAssignment','user','storedFile','grade','examAttempt','gradeObjection'] as const;
  const originals=delegates.map(k=>prisma[k]);
  for(const k of delegates)(prisma as any)[k]=tx[k];
  (prisma as any).$transaction=async(callback:any)=>callback(tx);
  authService.getActiveUser=async id=>[admin,professor,...students].find(u=>u.id===id) as any;
  const call=async(user:typeof admin,path:string,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{authorization:`Bearer ${jwt.sign({role:user.role,sid:'verification'},env.JWT_SECRET,{subject:user.id,issuer:env.JWT_ISSUER,audience:env.JWT_AUDIENCE})}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  try{
   const course=await coursesService.create({code:'verify-'+Date.now(),titleFa:'Verification',termCode:'1405-1'},actor);
   const exams=[];
   for(const type of ['DESCRIPTIVE','MULTIPLE_CHOICE'] as const){
    const e=await examsService.create({courseId:course.id,titleFa:'Verification '+type,type,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),maxPoints:'20'},actor);
    if(type==='DESCRIPTIVE')await filesService.uploadQuestion(e.id,pdf,actor);
    exams.push(e);const q=await examsService.addQuestion(e.id,{promptFa:'Verification question',points:'20',authorOrder:1},actor);
    if(type==='MULTIPLE_CHOICE'){await examsService.addOption(e.id,q.id,{textFa:'A',position:1,isCorrect:true},actor);await examsService.addOption(e.id,q.id,{textFa:'B',position:2,isCorrect:false},actor)}
   }
   const [exam,other]=exams;assert.ok(exam&&other);
   const path=`/admin/exams/${exam.id}/students`;
   assert.equal((await call(professor,path,'POST',{studentIds:[students[0].id]})).status,403);
   assert.equal((await call(admin,path,'POST',{studentIds:[students[0].id]})).status,204);
   assert.equal((await call(admin,path,'POST',{studentIds:[students[0].id]})).status,204);
   assert.equal(await tx.examParticipant.count({where:{examId:exam.id}}),1);
   assert.ok(!(await examsService.list({}, {id:students[0].id,role:'STUDENT'})).items.some(e=>e.id===exam.id));
   for(const e of exams)await examsService.publish(e.id,actor);
   const visible=await examsService.list({}, {id:students[0].id,role:'STUDENT'});
   assert.ok(visible.items.some(e=>e.id===exam.id));assert.ok(!visible.items.some(e=>e.id===other.id));
   await assert.rejects(examsService.get(other.id,{id:students[0].id,role:'STUDENT'}));
   await assert.rejects(filesService.questionFiles(other.id,{id:students[0].id,role:'STUDENT'}));
   await assert.rejects(submissionsService.start(other.id,{id:students[0].id,role:'STUDENT'}));
   await tx.enrollment.create({data:{courseId:course.id,studentId:students[1].id}});
   await assert.rejects(submissionsService.start(exam.id,{id:students[1].id,role:'STUDENT'}));
   const studentActor={id:students[0].id,role:'STUDENT' as const};
   await assert.rejects(filesService.questionFiles(exam.id,studentActor));
   const beforeStartFiles=await filesService.questionFiles(exam.id,actor);
   await assert.rejects(filesService.download(beforeStartFiles[0].id,studentActor));
   const descriptive=await submissionsService.start(exam.id,studentActor);
   const questionFiles=await filesService.questionFiles(exam.id,studentActor);assert.equal(questionFiles.length,1);
   assert.deepEqual((await filesService.download(questionFiles[0].id,studentActor)).bytes,pdf.buffer);
   await assert.rejects(submissionsService.submit(descriptive.attempt.id,studentActor));
   await filesService.uploadAnswer(descriptive.attempt.id,pdf,studentActor);
   const deadline=descriptive.attempt.deadlineAt;
   await tx.examAttempt.update({where:{id:descriptive.attempt.id},data:{deadlineAt:new Date(Date.now()-1000)}});
   await assert.rejects(filesService.questionFiles(exam.id,studentActor));
   await assert.rejects(filesService.download(questionFiles[0].id,studentActor));
   await tx.examAttempt.update({where:{id:descriptive.attempt.id},data:{deadlineAt:deadline}});
   await submissionsService.submit(descriptive.attempt.id,studentActor);
   await assert.rejects(filesService.questionFiles(exam.id,studentActor));
   assert.equal((await filesService.answerFiles(descriptive.attempt.id,actor)).length,1);
   async function verifyGrade(attemptId:string){
    const draft=await descriptiveService.saveGrade(attemptId,actor.id,{score:'12'});
    await submissionsService.publishGrade(draft.id,actor);
    const revised=await descriptiveService.saveGrade(attemptId,actor.id,{score:'18.5'});
    assert.equal(revised.status,'PUBLISHED');assert.equal(revised.score,'18.5');
    assert.equal((await submissionsService.gradeForAttempt(attemptId,studentActor)).score,'18.5');
    const history=await tx.gradeRevision.findMany({where:{gradeId:draft.id}});
    assert.ok(history.some(r=>r.oldScore.toString()==='12'&&r.newScore.toString()==='18.5'));
    const count=history.length;await descriptiveService.saveGrade(attemptId,actor.id,{score:'18.5'});
    assert.equal(await tx.gradeRevision.count({where:{gradeId:draft.id}}),count);
    await assert.rejects(descriptiveService.saveGrade(attemptId,actor.id,{score:'21'}));
    await assert.rejects(descriptiveService.saveGrade(attemptId,actor.id,{score:'-1'}));
    await assert.rejects(descriptiveService.saveGrade(attemptId,students[1].id,{score:'10'}));
    const objection=await objectionsService.submit(draft.id,{reasonFa:'Verification objection'},studentActor);
    const identity={fullName:students[0].fullName,universityId:students[0].universityId};
    assert.deepEqual((await objectionsService.get(objection.id,actor)).student,identity);
    assert.deepEqual((await objectionsService.list({},actor)).items.find(o=>o.id===objection.id)?.student,identity);
    assert.deepEqual((await objectionsService.review(objection.id,actor)).student,identity);
    assert.deepEqual((await objectionsService.decide(objection.id,{responseFa:'Verification response'},actor)).student,identity);
    await assert.rejects(objectionsService.get(objection.id,{id:students[1].id,role:'STUDENT'}));

   }
   await verifyGrade(descriptive.attempt.id);
   assert.equal((await call(admin,path+'/'+students[0].id,'DELETE')).status,409);
   assert.equal((await call(admin,`/admin/exams/${other.id}/students`,'POST',{studentIds:[students[0].id]})).status,204);
   const mcq=await submissionsService.start(other.id,studentActor);
   await submissionsService.submit(mcq.attempt.id,studentActor);
   await verifyGrade(mcq.attempt.id);
   const listed=await submissionsService.list({},actor);
   for(const attemptId of [descriptive.attempt.id,mcq.attempt.id]){
    const row=listed.items.find(a=>a.id===attemptId) as any;
    assert.deepEqual(row.student,{fullName:students[0].fullName,universityId:students[0].universityId});
    const detail=await submissionsService.get(attemptId,actor) as any;
    assert.deepEqual(detail.student,row.student);
    assert.equal('passwordHash' in detail.student,false);
   }
   console.log('Professor submission lists and detail responses include student names and university codes.');
   console.log('Verified PDF question/answer upload and download, required answer files, published score revisions for both exam types, revision history, score limits, professor ownership, and admin-only assignments, idempotency, draft visibility, per-exam isolation, file protection, both attempt types, and protection of started attempts.');
   throw rollback;
  }finally{for(let i=0;i<delegates.length;i++)(prisma as any)[delegates[i]]=originals[i];(prisma as any).$transaction=originalTransaction;authService.getActiveUser=originalAuth}
 },{timeout:30000});
}catch(e){if(e!==rollback)throw e;console.log('All verification data rolled back.')}finally{Object.assign(privateStore,originalStore);await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await prisma.$disconnect()}
