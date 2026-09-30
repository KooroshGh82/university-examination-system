import type {Request,RequestHandler} from 'express';
import {objectionsService as s} from './objections.service.js';
const actor=(r:Request)=>({id:r.auth!.user.id,role:r.auth!.user.role});
export const objectionsController:Record<string,RequestHandler>={
  submit:async(r,res)=>res.status(201).json({data:await s.submit(r.params.gradeId!,r.body,actor(r))}),
  list:async(r,res)=>res.json({data:await s.list(r.query,actor(r))}),
  byGrade:async(r,res)=>res.json({data:await s.byGrade(r.params.gradeId!,r.query,actor(r))}),
  get:async(r,res)=>res.json({data:await s.get(r.params.objectionId!,actor(r))}),
  review:async(r,res)=>res.json({data:await s.review(r.params.objectionId!,actor(r))}),
  decide:async(r,res)=>res.json({data:await s.decide(r.params.objectionId!,r.body,actor(r))})
};
