import { Prisma,type ExamAttempt } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../errors.js';
import { uuid,gradeBody } from './descriptive.schemas.js';

type Tx=Prisma.TransactionClient;
const missing=(what:string):never=>{throw new AppError(404,'NOT_FOUND',`${what} not found`);};
const conflict=(code:string,message:string):never=>{throw new AppError(409,code,message);};
const nowDb=async(tx:Tx)=>{const rows=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;return rows[0]!.now;};
const summary=(a:ExamAttempt)=>({id:a.id,examId:a.examId,studentId:a.studentId,status:a.status,startedAt:a.startedAt,deadlineAt:a.deadlineAt,submittedAt:a.submittedAt});
const lockAttempt=async(tx:Tx,id:string)=>{await tx.$queryRaw`SELECT id FROM exam_attempts WHERE id = ${id}::uuid FOR UPDATE`;return await tx.examAttempt.findUnique({where:{id},include:{exam:true}})??missing('Attempt');};
// Clamp day of month when the sixth later month has fewer days.
export const sixMonthsLater=(date:Date)=>{
  const year=date.getUTCFullYear(),month=date.getUTCMonth()+6;
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  const result=new Date(date);result.setUTCDate(1);result.setUTCFullYear(year,month,Math.min(date.getUTCDate(),lastDay));return result;
};
export const descriptiveService={
  async start(examId:string,studentId:string){
    examId=uuid.parse(examId);
    const result=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR SHARE`;
      const e=await tx.exam.findUnique({where:{id:examId}})??missing('Exam');
      if(e.type!=='DESCRIPTIVE'||e.status!=='PUBLISHED')missing('Exam');
      if(!await tx.examParticipant.findUnique({where:{examId_studentId:{examId:e.id,studentId:studentId}}}))return missing('Exam');
      await tx.$queryRaw`SELECT id FROM enrollments WHERE course_id = ${e.courseId}::uuid AND student_id = ${studentId}::uuid FOR UPDATE`;
      const enrollment=await tx.enrollment.findUnique({where:{courseId_studentId:{courseId:e.courseId,studentId}}});
      if(!enrollment?.isActive)return missing('Exam');
      const existing=await tx.examAttempt.findUnique({where:{examId_studentId:{examId,studentId}}});
      if(existing){
        if(existing.status!=='IN_PROGRESS')conflict('ALREADY_ATTEMPTED','Exam already finalized');
        const a=await lockAttempt(tx,existing.id);
        if(await nowDb(tx)>=a.deadlineAt){
          await tx.examAttempt.update({where:{id:a.id},data:{status:'ABSENT'}});
          await tx.auditEvent.create({data:{actorId:null,action:'DESCRIPTIVE_ABSENT',entityType:'ExamAttempt',entityId:a.id}});
          return {expired:true as const};
        }
        return {expired:false as const,created:false,attempt:summary(a)};
      }
      const now=await nowDb(tx);
      if(now<e.startsAt||now>=e.endsAt)conflict('EXAM_NOT_OPEN','Exam is outside its scheduled window');
      const deadline=e.durationMinutes?new Date(Math.min(e.endsAt.getTime(),now.getTime()+e.durationMinutes*60000)):e.endsAt;
      const a=await tx.examAttempt.create({data:{examId:e.id,courseId:e.courseId,studentId,enrollmentId:enrollment.id,startedAt:now,deadlineAt:deadline}});
      await tx.auditEvent.create({data:{actorId:studentId,action:'ATTEMPT_STARTED',entityType:'ExamAttempt',entityId:a.id}});
      return {expired:false as const,created:true,attempt:summary(a)};
    });
    if(result.expired)conflict('DEADLINE_PASSED','Descriptive attempt became absent at cutoff');
    return result;
  },
  async submit(id:string,studentId:string){
    id=uuid.parse(id);
    const result=await prisma.$transaction(async tx=>{
      const a=await lockAttempt(tx,id);
      if(a.studentId!==studentId||a.exam.type!=='DESCRIPTIVE')missing('Attempt');
      if(a.status==='SUBMITTED')return {expired:false,receipt:summary(a)};
      if(a.status!=='IN_PROGRESS')conflict('ATTEMPT_FINALIZED','Attempt cannot be submitted');
      const now=await nowDb(tx);
      if(now>=a.deadlineAt){
        await tx.examAttempt.update({where:{id:a.id},data:{status:'ABSENT'}});
        await tx.auditEvent.create({data:{actorId:null,action:'DESCRIPTIVE_ABSENT',entityType:'ExamAttempt',entityId:a.id}});
        return {expired:true,receipt:null};
      }
      const files=await tx.storedFile.findMany({where:{attemptId:a.id,kind:'STUDENT_ANSWER',storageKey:{not:null},purgedAt:null}});
      if(files.length<1||files.length>5)throw new AppError(422,'NO_ANSWER_FILES','Submit one to five accepted answer files');
      const submitted=await tx.examAttempt.update({where:{id:a.id},data:{status:'SUBMITTED',submittedAt:now}});
      await tx.storedFile.updateMany({where:{id:{in:files.map(f=>f.id)}},data:{purgeAfter:sixMonthsLater(now)}});
      await tx.auditEvent.create({data:{actorId:studentId,action:'DESCRIPTIVE_SUBMITTED',entityType:'ExamAttempt',entityId:a.id,details:{fileCount:files.length}}});
      return {expired:false,receipt:summary(submitted)};
    });
    if(result.expired)conflict('DEADLINE_PASSED','Deadline passed; descriptive attempt marked absent');
    return result.receipt!;
  },
  async saveGrade(id:string,professorId:string,body:unknown){
    id=uuid.parse(id);const input=gradeBody.parse(body);
    return prisma.$transaction(async tx=>{
      const a=await lockAttempt(tx,id);
      if(a.exam.type!=='DESCRIPTIVE'||a.status!=='SUBMITTED')missing('Submitted descriptive attempt');
      const assignment=await tx.professorAssignment.findUnique({where:{id:a.exam.assignmentId}});
      if(a.exam.professorId!==professorId||!assignment?.isActive||assignment.professorId!==professorId)missing('Attempt');
      const score=new Prisma.Decimal(input.score);
      if(score.gt(a.exam.maxPoints))throw new AppError(422,'INVALID_SCORE','Score exceeds exam maximum');
      const current=await tx.grade.findUnique({where:{attemptId:a.id}});
      if(current){
        await tx.$queryRaw`SELECT id FROM grades WHERE id = ${current.id}::uuid FOR UPDATE`;
        const locked=await tx.grade.findUnique({where:{id:current.id}})??missing('Grade');
        if(locked.status!=='DRAFT')conflict('GRADE_LOCKED','Published grade cannot be edited');
      }
      const g=current
        ?await tx.grade.update({where:{id:current.id},data:{score,commentsFa:input.commentsFa,gradedAt:await nowDb(tx)}})
        :await tx.grade.create({data:{attemptId:a.id,score,commentsFa:input.commentsFa,status:'DRAFT'}});
      await tx.auditEvent.create({data:{actorId:professorId,action:current?'GRADE_DRAFT_UPDATED':'GRADE_DRAFT_CREATED',entityType:'Grade',entityId:g.id}});
      return {id:g.id,attemptId:g.attemptId,score:g.score.toString(),commentsFa:g.commentsFa,status:g.status,publishedAt:g.publishedAt};
    });
  },
  async markAbsentDue(id:string){return prisma.$transaction(async tx=>{
    const a=await lockAttempt(tx,uuid.parse(id));
    if(a.exam.type!=='DESCRIPTIVE'||a.status!=='IN_PROGRESS'||await nowDb(tx)<a.deadlineAt)return false;
    await tx.examAttempt.update({where:{id:a.id},data:{status:'ABSENT'}});
    await tx.auditEvent.create({data:{actorId:null,action:'DESCRIPTIVE_ABSENT',entityType:'ExamAttempt',entityId:a.id}});return true;
  });}
};
