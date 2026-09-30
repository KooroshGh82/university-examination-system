import { Prisma,type UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../errors.js';
import { privateStore,inspectFile } from '../../storage/privateStore.js';
import { uuid } from '../descriptive/descriptive.schemas.js';

type Actor={id:string;role:UserRole};type Tx=Prisma.TransactionClient;
type Upload={buffer:Buffer;mimetype:string;originalname:string};
const missing=(what:string):never=>{throw new AppError(404,'NOT_FOUND',`${what} not found`);};
const conflict=(code:string,message:string):never=>{throw new AppError(409,code,message);};
const nowDb=async(tx:Tx)=>{const rows=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;return rows[0]!.now;};
const view=(f:{id:string;kind:string;originalName:string;mimeType:string;sizeBytes:number;sha256:string;uploadedAt:Date;purgedAt:Date|null})=>({id:f.id,kind:f.kind,originalName:f.originalName,mimeType:f.mimeType,sizeBytes:f.sizeBytes,sha256:f.sha256,uploadedAt:f.uploadedAt,purgedAt:f.purgedAt});
const staff=async(tx:Tx,exam:{id:string;courseId:string;professorId:string;assignmentId:string},actor:Actor)=>{
  if(actor.role==='STUDENT')missing('Exam');
  const assignment=await tx.professorAssignment.findUnique({where:{id:exam.assignmentId}});
  if(!assignment?.isActive||assignment.courseId!==exam.courseId||assignment.professorId!==exam.professorId||(actor.role==='PROFESSOR'&&exam.professorId!==actor.id))missing('Exam');
};
const canReadQuestion=async(tx:Tx,e:{id:string;courseId:string;professorId:string;assignmentId:string;status:string;startsAt:Date;endsAt:Date},actor:Actor)=>{
  if(actor.role!=='STUDENT')return staff(tx,e,actor);
  if(!await tx.examParticipant.findUnique({where:{examId_studentId:{examId:e.id,studentId:actor.id}}}))missing('File');
  const enrollment=await tx.enrollment.findUnique({where:{courseId_studentId:{courseId:e.courseId,studentId:actor.id}}});
  const now=await nowDb(tx);
  if(!enrollment?.isActive||e.status!=='PUBLISHED'||now<e.startsAt||now>=e.endsAt)missing('File');
};
const attemptAccess=async(tx:Tx,a:{id:string;studentId:string;courseId:string;status:string;exam:{id:string;courseId:string;professorId:string;assignmentId:string}},actor:Actor)=>{
  if(actor.role==='STUDENT'){if(a.studentId!==actor.id)missing('Attempt');return;}
  await staff(tx,a.exam,actor);
  if(a.status!=='SUBMITTED')missing('Attempt');
};
export const filesService={
  async uploadQuestion(examId:string,input:Upload,actor:Actor){
    examId=uuid.parse(examId);const meta=inspectFile(input,true);const key=await privateStore.write(input.buffer);
    try{return await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR UPDATE`;
      const e=await tx.exam.findUnique({where:{id:examId}})??missing('Exam');
      await staff(tx,e,actor);
      if(e.type!=='DESCRIPTIVE'||e.status!=='DRAFT')conflict('EXAM_LOCKED','Only draft descriptive exams accept question files');
      const f=await tx.storedFile.create({data:{kind:'EXAM_QUESTION',examId:e.id,storageKey:key,...meta}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'QUESTION_FILE_UPLOADED',entityType:'StoredFile',entityId:f.id}});
      return view(f);
    });}catch(e){await privateStore.remove(key);throw e;}
  },
  async removeQuestion(examId:string,fileId:string,actor:Actor){
    examId=uuid.parse(examId);fileId=uuid.parse(fileId);
    const key=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR UPDATE`;
      const e=await tx.exam.findUnique({where:{id:examId}})??missing('Exam');
      await staff(tx,e,actor);
      if(e.status!=='DRAFT')conflict('EXAM_LOCKED','Published question files cannot be changed');
      const f=await tx.storedFile.findUnique({where:{id:fileId}});
      if(!f||f.kind!=='EXAM_QUESTION'||f.examId!==e.id)return missing('File');
      await tx.storedFile.delete({where:{id:f.id}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'QUESTION_FILE_REMOVED',entityType:'StoredFile',entityId:f.id}});
      return f.storageKey;
    });
    if(key)await privateStore.remove(key);
  },
  async uploadAnswer(attemptId:string,input:Upload,actor:Actor){
    attemptId=uuid.parse(attemptId);const meta=inspectFile(input,false);const key=await privateStore.write(input.buffer);
    try{return await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exam_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
      const a=await tx.examAttempt.findUnique({where:{id:attemptId},include:{exam:true}})??missing('Attempt');
      if(actor.role!=='STUDENT'||a.studentId!==actor.id||a.exam.type!=='DESCRIPTIVE')missing('Attempt');
      if(a.status!=='IN_PROGRESS')conflict('ATTEMPT_FINALIZED','Attempt cannot accept files');
      if(await nowDb(tx)>=a.deadlineAt)conflict('DEADLINE_PASSED','Attempt deadline passed');
      const count=await tx.storedFile.count({where:{attemptId:a.id,kind:'STUDENT_ANSWER',storageKey:{not:null},purgedAt:null}});
      if(count>=5)conflict('FILE_LIMIT','At most five answer files are allowed');
      const f=await tx.storedFile.create({data:{kind:'STUDENT_ANSWER',attemptId:a.id,storageKey:key,...meta}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'ANSWER_FILE_UPLOADED',entityType:'StoredFile',entityId:f.id}});
      return view(f);
    });}catch(e){await privateStore.remove(key);throw e;}
  },
  async questionFiles(examId:string,actor:Actor){return prisma.$transaction(async tx=>{
    const e=await tx.exam.findUnique({where:{id:uuid.parse(examId)}})??missing('Exam');
    await canReadQuestion(tx,e,actor);
    return (await tx.storedFile.findMany({where:{examId:e.id,kind:'EXAM_QUESTION'},orderBy:{uploadedAt:'asc'}})).map(view);
  });},
  async answerFiles(attemptId:string,actor:Actor){return prisma.$transaction(async tx=>{
    const a=await tx.examAttempt.findUnique({where:{id:uuid.parse(attemptId)},include:{exam:true}})??missing('Attempt');
    if(a.exam.type!=='DESCRIPTIVE')missing('Attempt');
    await attemptAccess(tx,a,actor);
    return (await tx.storedFile.findMany({where:{attemptId:a.id,kind:'STUDENT_ANSWER',storageKey:{not:null}},orderBy:{uploadedAt:'asc'}})).map(view);
  });},
  async download(fileId:string,actor:Actor){
    const f=await prisma.storedFile.findUnique({where:{id:uuid.parse(fileId)},include:{exam:true,attempt:{include:{exam:true}}}})??missing('File');
    await prisma.$transaction(async tx=>{
      if(f.kind==='EXAM_QUESTION'){if(!f.exam)return missing('File');await canReadQuestion(tx,f.exam,actor);}
      else{if(!f.attempt)return missing('File');await attemptAccess(tx,f.attempt,actor);}
    });
    if(!f.storageKey||f.purgedAt)throw new AppError(410,'FILE_PURGED','File bytes have been purged');
    const bytes=await privateStore.read(f.storageKey);
    const extension=f.mimeType==='application/pdf'?'pdf':f.mimeType==='image/png'?'png':'jpg';
    return {bytes,mimeType:f.mimeType,downloadName:`${f.kind==='EXAM_QUESTION'?'question':'answer'}-${f.id}.${extension}`};
  },
  async removeAnswer(attemptId:string,fileId:string,actor:Actor){
    attemptId=uuid.parse(attemptId);fileId=uuid.parse(fileId);
    const key=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exam_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
      const a=await tx.examAttempt.findUnique({where:{id:attemptId},include:{exam:true}})??missing('Attempt');
      if(actor.role!=='STUDENT'||a.studentId!==actor.id||a.exam.type!=='DESCRIPTIVE')missing('Attempt');
      if(a.status!=='IN_PROGRESS'||await nowDb(tx)>=a.deadlineAt)conflict('ATTEMPT_FINALIZED','File cannot be deleted after cutoff');
      const f=await tx.storedFile.findUnique({where:{id:fileId}});
      if(!f||f.attemptId!==a.id||!f.storageKey)return missing('File');
      await tx.storedFile.delete({where:{id:f.id}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'ANSWER_FILE_REMOVED',entityType:'StoredFile',entityId:f.id}});
      return f.storageKey;
    });
    await privateStore.remove(key);
  }
};
