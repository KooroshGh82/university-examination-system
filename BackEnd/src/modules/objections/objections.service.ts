import { Prisma,type UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../errors.js';
import { objectionsRepository as repo } from './objections.repository.js';
import { submitBody,decisionBody,listQuery,uuid } from './objections.schemas.js';
import { withinWindow } from './objections.rules.js';

type Actor={id:string;role:UserRole};type Tx=Prisma.TransactionClient;
const missing=(what:string):never=>{throw new AppError(404,'NOT_FOUND',`${what} not found`);};
const conflict=(code:string,message:string):never=>{throw new AppError(409,code,message);};
const nowDb=async(tx:Tx)=>{const rows=await tx.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;return rows[0]!.now;};
const lockGrade=async(tx:Tx,id:string)=>{
  await tx.$queryRaw`SELECT id FROM grades WHERE id = ${id}::uuid FOR UPDATE`;
  return await tx.grade.findUnique({where:{id},include:{attempt:{include:{exam:true}}}})??missing('Grade');
};
const professorFor=async(tx:Tx,g:{attempt:{courseId:string;exam:{professorId:string;assignmentId:string}}},actor:Actor)=>{
  if(actor.role!=='PROFESSOR'||g.attempt.exam.professorId!==actor.id)missing('Objection');
  const assignment=await tx.professorAssignment.findUnique({where:{id:g.attempt.exam.assignmentId}});
  if(!assignment?.isActive||assignment.professorId!==actor.id||assignment.courseId!==g.attempt.courseId)missing('Objection');
};
const view=(o:{id:string;gradeId:string;studentId:string;round:number;reasonFa:string;status:string;submittedAt:Date;decision:{id:string;professorId:string;responseFa:string;decidedAt:Date;revisionId:string|null}|null})=>({id:o.id,gradeId:o.gradeId,studentId:o.studentId,round:o.round,reasonFa:o.reasonFa,status:o.status,submittedAt:o.submittedAt,decision:o.decision?{id:o.decision.id,professorId:o.decision.professorId,responseFa:o.decision.responseFa,decidedAt:o.decision.decidedAt,revisionId:o.decision.revisionId}:null});
const page=<T extends {id:string}>(rows:T[],limit:number)=>{const hasNext=rows.length>limit;if(hasNext)rows.pop();return {items:rows,...(hasNext?{nextCursor:rows.at(-1)!.id}:{})};};
const authorize=async(o:NonNullable<Awaited<ReturnType<typeof repo.objection>>>,actor:Actor)=>{
  if(actor.role==='STUDENT'){if(o.studentId!==actor.id||o.grade.status!=='PUBLISHED')missing('Objection');return;}
  if(actor.role!=='PROFESSOR'||o.grade.attempt.exam.professorId!==actor.id)missing('Objection');
  const a=await prisma.professorAssignment.findUnique({where:{id:o.grade.attempt.exam.assignmentId}});
  if(!a?.isActive||a.professorId!==actor.id)missing('Objection');
};
export const objectionsService={
  async submit(gradeId:string,body:unknown,actor:Actor){
    gradeId=uuid.parse(gradeId);const {reasonFa}=submitBody.parse(body);
    return prisma.$transaction(async tx=>{
      const g=await lockGrade(tx,gradeId);
      if(g.status!=='PUBLISHED'||g.attempt.studentId!==actor.id||!g.publishedAt)return missing('Grade');
      const prior=await tx.gradeObjection.findFirst({where:{gradeId},orderBy:{round:'desc'},include:{decision:true}});
      const round=(prior?.round??0)+1;
      if(round>3)conflict('ROUND_LIMIT','At most three objection rounds are allowed');
      if(prior&&!['CONFIRMED','CHANGED'].includes(prior.status))conflict('ROUND_UNAVAILABLE','Previous objection is unresolved');
      if(prior&&!prior.decision)conflict('ROUND_UNAVAILABLE','Previous objection has no recorded decision');
      const anchor=prior?.decision?.decidedAt??g.publishedAt;
      const now=await nowDb(tx);
      if(!withinWindow(now,anchor))conflict('WINDOW_CLOSED','Seven-day objection window has closed');
      const o=await tx.gradeObjection.create({data:{gradeId,studentId:actor.id,round,reasonFa,status:'SUBMITTED',submittedAt:now},include:{decision:true}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'OBJECTION_SUBMITTED',entityType:'GradeObjection',entityId:o.id,details:{round}}});
      return view(o);
    });
  },
  async list(query:unknown,actor:Actor){
    const q=listQuery.parse(query);
    const rows=await prisma.gradeObjection.findMany({where:{...(q.gradeId?{gradeId:q.gradeId}:{}),...(q.status?{status:q.status}:{}),
      grade:{...(q.examId?{attempt:{examId:q.examId}}:{}),attempt:actor.role==='STUDENT'?{studentId:actor.id,...(q.examId?{examId:q.examId}:{})}:{exam:{professorId:actor.id,assignment:{isActive:true}},...(q.examId?{examId:q.examId}:{})},
        ...(actor.role==='STUDENT'?{status:'PUBLISHED'}:{})}
    },include:{decision:true},orderBy:{id:'asc'},take:q.limit+1,...(q.cursor?{cursor:{id:q.cursor},skip:1}:{})});
    const p=page(rows,q.limit);return {...p,items:p.items.map(view)};
  },
  async byGrade(gradeId:string,query:unknown,actor:Actor){
    const id=uuid.parse(gradeId),q=listQuery.parse(query);
    const g=await repo.grade(id)??missing('Grade');
    if(actor.role==='STUDENT'){if(g.attempt.studentId!==actor.id||g.status!=='PUBLISHED')missing('Grade');}
    else{
      if(actor.role!=='PROFESSOR'||g.attempt.exam.professorId!==actor.id)missing('Grade');
      const a=await prisma.professorAssignment.findUnique({where:{id:g.attempt.exam.assignmentId}});if(!a?.isActive)missing('Grade');
    }
    return this.list({...q,gradeId:id},actor);
  },
  async get(id:string,actor:Actor){const o=await repo.objection(uuid.parse(id))??missing('Objection');await authorize(o,actor);return view(o);},
  async review(id:string,actor:Actor){
    id=uuid.parse(id);
    return prisma.$transaction(async tx=>{
      const initial=await tx.gradeObjection.findUnique({where:{id}})??missing('Objection');
      const g=await lockGrade(tx,initial.gradeId);await professorFor(tx,g,actor);
      const o=await tx.gradeObjection.findUnique({where:{id},include:{decision:true}})??missing('Objection');
      if(o.status==='UNDER_REVIEW')return view(o);
      if(o.status!=='SUBMITTED')conflict('OBJECTION_RESOLVED','Objection already resolved');
      const updated=await tx.gradeObjection.update({where:{id},data:{status:'UNDER_REVIEW'},include:{decision:true}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:'OBJECTION_REVIEW_OPENED',entityType:'GradeObjection',entityId:id}});
      return view(updated);
    });
  },
  async decide(id:string,body:unknown,actor:Actor){
    id=uuid.parse(id);const input=decisionBody.parse(body);
    return prisma.$transaction(async tx=>{
      const initial=await tx.gradeObjection.findUnique({where:{id}})??missing('Objection');
      const g=await lockGrade(tx,initial.gradeId);await professorFor(tx,g,actor);
      const o=await tx.gradeObjection.findUnique({where:{id},include:{decision:true}})??missing('Objection');
      if(o.status!=='UNDER_REVIEW'||o.decision)conflict('OBJECTION_RESOLVED','Objection is not open for a decision');
      let revisionId:string|undefined;
      if(input.newScore!==undefined){
        const newScore=new Prisma.Decimal(input.newScore);
        if(newScore.gt(g.attempt.exam.maxPoints))throw new AppError(422,'INVALID_SCORE','Score exceeds exam maximum');
        if(newScore.eq(g.score))throw new AppError(422,'INVALID_SCORE','Use confirmation when the score is unchanged');
        const revision=await tx.gradeRevision.create({data:{gradeId:g.id,professorId:actor.id,oldScore:g.score,newScore,reasonFa:input.responseFa}});
        revisionId=revision.id;
        await tx.grade.update({where:{id:g.id},data:{score:newScore}});
        await tx.auditEvent.create({data:{actorId:actor.id,action:'GRADE_REVISED',entityType:'Grade',entityId:g.id,details:{revisionId,oldScore:g.score.toString(),newScore:newScore.toString()}}});
      }
      const at=await nowDb(tx);
      const decision=await tx.objectionDecision.create({data:{objectionId:o.id,professorId:actor.id,responseFa:input.responseFa,revisionId,decidedAt:at}});
      const updated=await tx.gradeObjection.update({where:{id},data:{status:revisionId?'CHANGED':'CONFIRMED'},include:{decision:true}});
      await tx.auditEvent.create({data:{actorId:actor.id,action:revisionId?'OBJECTION_CHANGED':'OBJECTION_CONFIRMED',entityType:'GradeObjection',entityId:id,details:{decisionId:decision.id}}});
      return view(updated);
    });
  }
};
