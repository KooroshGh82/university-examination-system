import { type UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../errors.js';
import { gradesRepository as repo } from './grades.repository.js';
import { summarizePerformance } from './performance.js';
import { gradeList,performanceQuery,historyQuery,uuid } from './grades.schemas.js';
import { submissionsService } from '../submissions/submissions.service.js';

type Actor={id:string;role:UserRole};
const missing=(thing:string):never=>{throw new AppError(404,'NOT_FOUND',`${thing} not found`);};
const page=<T extends {id:string}>(rows:T[],limit:number)=>{const more=rows.length>limit;if(more)rows.pop();return {items:rows,...(more?{nextCursor:rows.at(-1)!.id}:{})};};
const view=(g:Awaited<ReturnType<typeof repo.grade>>)=>{
  if(!g)return missing('Grade');
  return {id:g.id,attemptId:g.attemptId,studentId:g.attempt.studentId,examId:g.attempt.examId,examTitleFa:g.attempt.exam.titleFa,courseId:g.attempt.courseId,score:g.score.toString(),maxPoints:g.attempt.exam.maxPoints.toString(),commentsFa:g.commentsFa,status:g.status,gradedAt:g.gradedAt,publishedAt:g.publishedAt};
};
const permitted=async(g:NonNullable<Awaited<ReturnType<typeof repo.grade>>>,actor:Actor)=>{
  if(actor.role==='STUDENT'){
    if(g.attempt.studentId!==actor.id||g.status!=='PUBLISHED')missing('Grade');return;
  }
  if(actor.role!=='PROFESSOR'||g.attempt.exam.professorId!==actor.id)missing('Grade');
  const a=await prisma.professorAssignment.findUnique({where:{id:g.attempt.exam.assignmentId}});
  if(!a?.isActive||a.professorId!==actor.id)missing('Grade');
};
const assertFilters=async(courseId:string|undefined,examId:string|undefined,actor:Actor)=>{
  if(courseId){
    const linked=actor.role==='STUDENT'
      ?await prisma.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId:actor.id}}})
      :await prisma.professorAssignment.findUnique({where:{courseId_professorId:{courseId,professorId:actor.id}}});
    if(!linked||(actor.role==='PROFESSOR'&&!linked.isActive))missing('Course');
  }
  if(examId){
    const e=await prisma.exam.findUnique({where:{id:examId}});
    if(!e||(courseId&&e.courseId!==courseId))return missing('Exam');
    if(actor.role==='STUDENT'){
      const enrollment=await prisma.enrollment.findUnique({where:{courseId_studentId:{courseId:e.courseId,studentId:actor.id}}});
      if(!enrollment)missing('Exam');
    }else{
      const assignment=await prisma.professorAssignment.findUnique({where:{id:e.assignmentId}});
      if(e.professorId!==actor.id||!assignment?.isActive)missing('Exam');
    }
  }
};
export const gradesService={
  async list(query:unknown,actor:Actor){
    const q=gradeList.parse(query);
    await assertFilters(q.courseId,q.examId,actor);
    if(actor.role==='STUDENT'&&q.status==='DRAFT')return {items:[]};
    const rows=await prisma.grade.findMany({where:{
      status:actor.role==='STUDENT'?'PUBLISHED':q.status,
      attempt:{...(q.courseId?{courseId:q.courseId}:{}),...(q.examId?{examId:q.examId}:{}),
        ...(actor.role==='STUDENT'?{studentId:actor.id}:{exam:{professorId:actor.id,assignment:{isActive:true}}})}
    },include:{attempt:{include:{exam:{include:{course:true}}}}},orderBy:{id:'asc'},take:q.limit+1,...(q.cursor?{cursor:{id:q.cursor},skip:1}:{})});
    const p=page(rows,q.limit);return {...p,items:p.items.map(view)};
  },
  async get(gradeId:string,actor:Actor){
    const g=await repo.grade(uuid.parse(gradeId))??missing('Grade');await permitted(g,actor);return view(g);
  },
  async revisions(gradeId:string,query:unknown,actor:Actor){
    const id=uuid.parse(gradeId),q=historyQuery.parse(query),g=await repo.grade(id)??missing('Grade');
    await permitted(g,actor);
    const rows=await prisma.gradeRevision.findMany({where:{gradeId:id},orderBy:{id:'asc'},take:q.limit+1,...(q.cursor?{cursor:{id:q.cursor},skip:1}:{})});
    const p=page(rows,q.limit);
    return {...p,items:p.items.map(r=>({id:r.id,gradeId:r.gradeId,oldScore:r.oldScore.toString(),newScore:r.newScore.toString(),reasonFa:r.reasonFa,professorId:r.professorId,changedAt:r.changedAt}))};
  },
  async performance(query:unknown,studentId:string){
    const q=performanceQuery.parse(query);
    if(q.courseId)await assertFilters(q.courseId,undefined,{id:studentId,role:'STUDENT'});
    const grades=await repo.publishedForStudent(studentId,q.courseId);
    const rows=grades.map(g=>({gradeId:g.id,examId:g.attempt.examId,examTitleFa:g.attempt.exam.titleFa,courseId:g.attempt.courseId,courseCode:g.attempt.exam.course.code,termCode:g.attempt.exam.course.termCode,startsAt:g.attempt.exam.startsAt,score:g.score,maxPoints:g.attempt.exam.maxPoints}));
    return summarizePerformance(rows);
  },
  publish(gradeId:string,actor:Actor){return submissionsService.publishGrade(gradeId,actor);}
};
