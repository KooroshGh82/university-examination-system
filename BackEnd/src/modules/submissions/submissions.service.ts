import crypto from 'node:crypto';
import { Prisma,type ExamAttempt,type UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../errors.js';
import { submissionsRepository as repo } from './submissions.repository.js';
import { answerBody,listAttempts,uuid } from './submissions.schemas.js';
import { descriptiveService } from '../descriptive/descriptive.service.js';

type Actor={id:string;role:UserRole};type Tx=Prisma.TransactionClient;
const missing=(label:string):never=>{throw new AppError(404,'NOT_FOUND','اطلاعات مورد نظر یافت نشد.');};
const conflict=(code:string,message:string):never=>{throw new AppError(409,code,message);};
const nowDb=async(tx:Tx)=>{const rows=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;return rows[0]!.now;};
const lockAttempt=async(tx:Tx,id:string)=>{
  await tx.$queryRaw`SELECT id FROM exam_attempts WHERE id = ${id}::uuid FOR UPDATE`;
  return await tx.examAttempt.findUnique({where:{id},include:{exam:true}})??missing('Attempt');
};
const staffScope=async(tx:Tx,attempt:ExamAttempt & {exam:{assignmentId:string;professorId:string}},actor:Actor)=>{
  if(actor.role!=='PROFESSOR'||attempt.exam.professorId!==actor.id) missing('Attempt');
  const a=await tx.professorAssignment.findUnique({where:{id:attempt.exam.assignmentId}});
  if(!a?.isActive||a.professorId!==actor.id||a.courseId!==attempt.courseId) missing('Attempt');
};
const summary=(a:ExamAttempt)=>({id:a.id,examId:a.examId,studentId:a.studentId,status:a.status,startedAt:a.startedAt,deadlineAt:a.deadlineAt,submittedAt:a.submittedAt});
const gradeView=(g:{id:string;attemptId:string;score:Prisma.Decimal;commentsFa:string|null;status:string;publishedAt:Date|null})=>({id:g.id,attemptId:g.attemptId,score:g.score.toString(),commentsFa:g.commentsFa,status:g.status,publishedAt:g.publishedAt});
const questionProjection=async(tx:Tx,a:ExamAttempt,professor:boolean)=>{
  const placements=await tx.attemptQuestion.findMany({where:{attemptId:a.id},orderBy:{position:'asc'},include:{
    question:{include:{options:{orderBy:{position:'asc'}}}},answer:true
  }});
  return placements.map(p=>({attemptQuestionId:p.id,questionId:p.questionId,position:p.position,promptFa:p.question.promptFa,points:p.question.points.toString(),
    options:p.question.options.map(o=>({id:o.id,position:o.position,textFa:o.textFa,...(professor?{isCorrect:o.isCorrect}:{})})),
    selectedOptionId:p.answer?.optionId??null,...(professor?{isSelectedCorrect:p.answer?!!p.question.options.find(o=>o.id===p.answer!.optionId&&o.isCorrect):false}:{})
  }));
};
const finalize=async(tx:Tx,a:ExamAttempt,mode:'SUBMITTED'|'AUTO_SUBMITTED',at:Date)=>{
  const placements=await tx.attemptQuestion.findMany({where:{attemptId:a.id},include:{question:{include:{options:{where:{isCorrect:true}}}},answer:true}});
  const score=placements.reduce((total,p)=>total.plus(p.answer&&p.question.options.some(o=>o.id===p.answer!.optionId)?p.question.points:new Prisma.Decimal(0)),new Prisma.Decimal(0));
  await tx.examAttempt.update({where:{id:a.id},data:{status:mode,submittedAt:at}});
  await tx.grade.create({data:{attemptId:a.id,score,status:'DRAFT'}});
  await tx.auditEvent.create({data:{actorId:mode==='SUBMITTED'?a.studentId:null,action:mode==='SUBMITTED'?'ATTEMPT_SUBMITTED':'ATTEMPT_AUTO_SUBMITTED',entityType:'ExamAttempt',entityId:a.id,details:{effectiveAt:at.toISOString()}}});
  return {...summary({...a,status:mode,submittedAt:at}),autoSubmitted:mode==='AUTO_SUBMITTED'};
};
const randomOrder=<T>(values:T[])=>{
  const out=[...values];for(let i=out.length-1;i>0;i--){const j=crypto.randomInt(i+1);[out[i],out[j]]=[out[j]!,out[i]!];}return out;
};
const page=<T extends {id:string}>(rows:T[],limit:number)=>{const hasNext=rows.length>limit;if(hasNext)rows.pop();return {items:rows,...(hasNext?{nextCursor:rows.at(-1)!.id}:{})};};
export const submissionsService={
  async start(examId:string,actor:Actor){
    examId=uuid.parse(examId);
    if((await repo.exam(examId))?.type==='DESCRIPTIVE'){
      const result=await descriptiveService.start(examId,actor.id);
      return {...result,questions:[]};
    }
    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR SHARE`;
      const e=await tx.exam.findUnique({where:{id:examId}})??missing('Exam');
      if(e.type!=='MULTIPLE_CHOICE'||e.status!=='PUBLISHED') missing('Exam');
      if(!await tx.examParticipant.findUnique({where:{examId_studentId:{examId:e.id,studentId:actor.id}}}))return missing('Exam');
      await tx.$queryRaw`SELECT id FROM enrollments WHERE course_id = ${e.courseId}::uuid AND student_id = ${actor.id}::uuid FOR UPDATE`;
      const enrollment=await tx.enrollment.findUnique({where:{courseId_studentId:{courseId:e.courseId,studentId:actor.id}}});
      if(!enrollment?.isActive) return missing('Exam');
      const existing=await tx.examAttempt.findUnique({where:{examId_studentId:{examId,studentId:actor.id}}});
      if(existing){
        if(existing.status!=='IN_PROGRESS') conflict('ALREADY_ATTEMPTED','این آزمون را قبلاً تکمیل کرده‌اید.');
        const locked=await lockAttempt(tx,existing.id);
        if(await nowDb(tx)>=locked.deadlineAt){
          await finalize(tx,locked,'AUTO_SUBMITTED',locked.deadlineAt);
          return {expired:true as const};
        }
        return {expired:false as const,created:false,attempt:summary(locked),questions:await questionProjection(tx,locked,false)};
      }
      const now=await nowDb(tx);
      if(now<e.startsAt||now>=e.endsAt) conflict('EXAM_NOT_OPEN','آزمون فقط در بازه زمانی تعیین‌شده قابل شروع است.');
      const deadline=e.durationMinutes?new Date(Math.min(e.endsAt.getTime(),now.getTime()+e.durationMinutes*60000)):e.endsAt;
      const questions=await tx.examQuestion.findMany({where:{examId:e.id},select:{id:true}});
      if(!questions.length) conflict('INVALID_EXAM_CONTENT','هنوز سؤالی برای این آزمون ثبت نشده است.');
      const attempt=await tx.examAttempt.create({data:{examId:e.id,courseId:e.courseId,studentId:actor.id,enrollmentId:enrollment.id,startedAt:now,deadlineAt:deadline}});
      const shuffled=randomOrder(questions);
      await tx.attemptQuestion.createMany({data:shuffled.map((q,i)=>({attemptId:attempt.id,examId:e.id,questionId:q.id,position:i+1}))});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'ATTEMPT_STARTED',entityType:'ExamAttempt',entityId:attempt.id}});
      return {expired:false as const,created:true,attempt:summary(attempt),questions:await questionProjection(tx,attempt,false)};
    });
    if(result.expired) conflict('DEADLINE_PASSED','مهلت پایان یافته و پاسخ‌های ذخیره‌شده به‌صورت خودکار ثبت شده‌اند.');
    return result;
  },
  async list(query:unknown,actor:Actor){
    const q=listAttempts.parse(query);
    if(actor.role==='PROFESSOR'&&(q.status==='IN_PROGRESS'||q.status==='ABSENT'))return {items:[]};
    const rows=await prisma.examAttempt.findMany({where:{...(q.examId?{examId:q.examId}:{}),...(q.status?{status:q.status}:{}),
      ...(actor.role==='STUDENT'?{studentId:actor.id}:{status:{in:['SUBMITTED','AUTO_SUBMITTED'] as const},exam:{professorId:actor.id,assignment:{isActive:true}}})},include:{student:{select:{user:{select:{fullName:true,universityId:true}}}}},orderBy:{id:'asc'},take:q.limit+1,...(q.cursor?{cursor:{id:q.cursor},skip:1}:{})});
    const p=page(rows,q.limit);
    if(actor.role==='STUDENT')return {...p,items:p.items.map(summary)};
    const grades=await prisma.grade.findMany({where:{attemptId:{in:p.items.map(a=>a.id)}}});
    const byAttempt=new Map(grades.map(g=>[g.attemptId,gradeView(g)]));
    return {...p,items:p.items.map(a=>({...summary(a),student:a.student.user,grade:byAttempt.get(a.id)??null}))};
  },
  async get(id:string,actor:Actor){
    id=uuid.parse(id);
    return prisma.$transaction(async tx=>{
      const a=await tx.examAttempt.findUnique({where:{id},include:{exam:true,student:{select:{user:{select:{fullName:true,universityId:true}}}}}})??missing('Attempt');
      if(actor.role==='STUDENT'){if(a.studentId!==actor.id)missing('Attempt');}
      else {await staffScope(tx,a,actor);if(!['SUBMITTED','AUTO_SUBMITTED'].includes(a.status))missing('Attempt');}
      const grade=actor.role==='PROFESSOR'?await tx.grade.findUnique({where:{attemptId:a.id}}):null;
      const files=a.exam.type==='DESCRIPTIVE'?await tx.storedFile.findMany({where:{attemptId:a.id,kind:'STUDENT_ANSWER',storageKey:{not:null}},select:{id:true,originalName:true,mimeType:true,sizeBytes:true,uploadedAt:true,purgedAt:true}}):undefined;
      return {...summary(a),...(a.exam.type==='MULTIPLE_CHOICE'?{questions:await questionProjection(tx,a,actor.role==='PROFESSOR')}:{files}),...(actor.role==='PROFESSOR'?{student:a.student.user,grade:grade?gradeView(grade):null}:{})};
    });
  },
  async save(id:string,placementId:string,body:unknown,actor:Actor){
    id=uuid.parse(id);placementId=uuid.parse(placementId);const {optionId}=answerBody.parse(body);
    const outcome=await prisma.$transaction(async tx=>{
      const a=await lockAttempt(tx,id);
      if(a.studentId!==actor.id||a.exam.type!=='MULTIPLE_CHOICE')missing('Attempt');
      if(a.status!=='IN_PROGRESS')conflict('ATTEMPT_FINALIZED','پس از ثبت نهایی امکان تغییر پاسخ‌ها وجود ندارد.');
      const now=await nowDb(tx);
      if(now>=a.deadlineAt)return {expired:true as const,receipt:await finalize(tx,a,'AUTO_SUBMITTED',a.deadlineAt)};
      const p=await tx.attemptQuestion.findUnique({where:{id:placementId}});
      if(!p||p.attemptId!==a.id)return missing('Attempt question');
      if(optionId){
        const option=await tx.multipleChoiceOption.findUnique({where:{id:optionId}});
        if(!option||option.questionId!==p.questionId)throw new AppError(422,'INVALID_OPTION','گزینه انتخابی متعلق به این سؤال نیست.');
        const answer=await tx.studentAnswer.upsert({where:{attemptQuestionId:p.id},create:{attemptQuestionId:p.id,questionId:p.questionId,optionId},update:{optionId,savedAt:now}});
        return {expired:false as const,answer:{attemptQuestionId:p.id,selectedOptionId:answer.optionId,savedAt:answer.savedAt}};
      }
      await tx.studentAnswer.deleteMany({where:{attemptQuestionId:p.id}});
      return {expired:false as const,answer:{attemptQuestionId:p.id,selectedOptionId:null,savedAt:now}};
    });
    if(outcome.expired)conflict('DEADLINE_PASSED','مهلت پاسخ‌گویی به پایان رسیده است.');
    return outcome.answer;
  },
  async submit(id:string,actor:Actor){
    id=uuid.parse(id);
    if((await repo.attempt(id))?.exam.type==='DESCRIPTIVE')return descriptiveService.submit(id,actor.id);
    const result=await prisma.$transaction(async tx=>{
      const a=await lockAttempt(tx,id);
      if(a.studentId!==actor.id||a.exam.type!=='MULTIPLE_CHOICE')missing('Attempt');
      if(a.status==='SUBMITTED'||a.status==='AUTO_SUBMITTED')return {expired:false,receipt:{...summary(a),autoSubmitted:a.status==='AUTO_SUBMITTED'}};
      if(a.status!=='IN_PROGRESS')conflict('ATTEMPT_FINALIZED','این پاسخ‌نامه قابل ثبت نهایی نیست.');
      const now=await nowDb(tx);
      if(now>=a.deadlineAt)return {expired:true,receipt:await finalize(tx,a,'AUTO_SUBMITTED',a.deadlineAt)};
      return {expired:false,receipt:await finalize(tx,a,'SUBMITTED',now)};
    });
    if(result.expired)conflict('DEADLINE_PASSED','مهلت پایان یافته و پاسخ‌های ذخیره‌شده به‌صورت خودکار ثبت شده‌اند.');
    return result.receipt;
  },
  async gradeForAttempt(id:string,actor:Actor){
    const a=await repo.attempt(uuid.parse(id))??missing('Attempt');
    if(actor.role==='STUDENT'){if(a.studentId!==actor.id)missing('Grade');}
    else if(actor.role==='PROFESSOR'){
      if(a.exam.professorId!==actor.id||!(await prisma.professorAssignment.findUnique({where:{id:a.exam.assignmentId}}))?.isActive)missing('Grade');
    }else missing('Grade');
    const grade=await repo.gradeForAttempt(a.id);
    if(!grade||(actor.role==='STUDENT'&&grade.status!=='PUBLISHED'))return missing('Grade');
    return gradeView(grade);
  },
  async publishGrade(gradeId:string,actor:Actor){
    gradeId=uuid.parse(gradeId);
    return prisma.$transaction(async tx=>{
      const grade=await tx.grade.findUnique({where:{id:gradeId},include:{attempt:{include:{exam:true}}}})??missing('Grade');
      await staffScope(tx,grade.attempt,actor);
      await tx.$queryRaw`SELECT id FROM grades WHERE id = ${gradeId}::uuid FOR UPDATE`;
      const current=await tx.grade.findUnique({where:{id:gradeId}})??missing('Grade');
      if(current.status==='PUBLISHED')return gradeView(current);
      if(!['SUBMITTED','AUTO_SUBMITTED'].includes(grade.attempt.status))conflict('GRADE_NOT_READY','ابتدا پاسخ‌نامه باید ثبت نهایی شود.');
      const at=await nowDb(tx);
      const published=await tx.grade.update({where:{id:gradeId},data:{status:'PUBLISHED',publishedAt:at}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'GRADE_PUBLISHED',entityType:'Grade',entityId:gradeId}});
      return gradeView(published);
    });
  },
  async finalizeDue(id:string){
    return prisma.$transaction(async tx=>{
      const a=await lockAttempt(tx,uuid.parse(id));
      if(a.exam.type!=='MULTIPLE_CHOICE'||a.status!=='IN_PROGRESS')return false;
      if(await nowDb(tx)<a.deadlineAt)return false;
      await finalize(tx,a,'AUTO_SUBMITTED',a.deadlineAt);return true;
    });
  }
};
