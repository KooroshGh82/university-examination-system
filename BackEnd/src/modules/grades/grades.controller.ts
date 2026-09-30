import type {Request,RequestHandler} from 'express';
import {gradesService as s} from './grades.service.js';
const actor=(r:Request)=>({id:r.auth!.user.id,role:r.auth!.user.role});
export const gradesController:Record<string,RequestHandler>={
  list:async(r,res)=>res.json({data:await s.list(r.query,actor(r))}),
  byCourse:async(r,res)=>res.json({data:await s.list({...r.query,courseId:r.params.courseId},actor(r))}),
  byExam:async(r,res)=>res.json({data:await s.list({...r.query,examId:r.params.examId},actor(r))}),
  get:async(r,res)=>res.json({data:await s.get(r.params.gradeId!,actor(r))}),
  revisions:async(r,res)=>res.json({data:await s.revisions(r.params.gradeId!,r.query,actor(r))}),
  performance:async(r,res)=>res.json({data:await s.performance(r.query,r.auth!.user.id)}),
  comparison:async(r,res)=>res.json({data:await s.performance({courseId:r.params.courseId},r.auth!.user.id)}),
  publish:async(r,res)=>res.json({data:await s.publish(r.params.gradeId!,actor(r))})
};
