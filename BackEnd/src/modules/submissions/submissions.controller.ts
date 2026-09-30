import type { Request,RequestHandler } from 'express';
import { submissionsService as s } from './submissions.service.js';
const actor=(r:Request)=>({id:r.auth!.user.id,role:r.auth!.user.role});
export const submissionsController:Record<string,RequestHandler>={
  start:async(r,res)=>{const result=await s.start(r.params.examId!,actor(r));res.status(result.created?201:200).json({data:{...result.attempt,questions:result.questions}});},
  list:async(r,res)=>res.json({data:await s.list(r.query,actor(r))}),
  get:async(r,res)=>res.json({data:await s.get(r.params.attemptId!,actor(r))}),
  save:async(r,res)=>res.json({data:await s.save(r.params.attemptId!,r.params.attemptQuestionId!,r.body,actor(r))}),
  submit:async(r,res)=>res.json({data:await s.submit(r.params.attemptId!,actor(r))}),
  grade:async(r,res)=>res.json({data:await s.gradeForAttempt(r.params.attemptId!,actor(r))})
};
