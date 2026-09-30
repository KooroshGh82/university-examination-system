import type { RequestHandler } from 'express';
import { coursesService as service } from './courses.service.js';
const actor = (req: Parameters<RequestHandler>[0]) => ({id:req.auth!.user.id,role:req.auth!.user.role});
export const coursesController: Record<string,RequestHandler> = {
  create: async(req,res)=>res.status(201).json({data:await service.create(req.body,actor(req))}),
  list: async(req,res)=>res.json({data:await service.list(req.query,actor(req))}),
  get: async(req,res)=>res.json({data:await service.get(req.params.courseId!,actor(req))}),
  update: async(req,res)=>res.json({data:await service.update(req.params.courseId!,req.body,actor(req))}),
  remove: async(req,res)=>{await service.remove(req.params.courseId!,actor(req));res.sendStatus(204);},
  myStudentCourses: async(req,res)=>res.json({data:await service.ownCourses(actor(req),req.query,'student')}),
  myProfessorCourses: async(req,res)=>res.json({data:await service.ownCourses(actor(req),req.query,'professor')}),
  addEnrollment: async(req,res)=>res.status(201).json({data:await service.addEnrollment(req.params.courseId!,req.body,actor(req))}),
  addAssignment: async(req,res)=>res.status(201).json({data:await service.addAssignment(req.params.courseId!,req.body,actor(req))}),
  listEnrollments: async(req,res)=>res.json({data:await service.listLinks(req.params.courseId!,req.query,'enrollment')}),
  listAssignments: async(req,res)=>res.json({data:await service.listLinks(req.params.courseId!,req.query,'assignment')}),
  updateEnrollment: async(req,res)=>res.json({data:await service.updateLink(req.params.courseId!,req.params.enrollmentId!,req.body,actor(req),'enrollment')}),
  updateAssignment: async(req,res)=>res.json({data:await service.updateLink(req.params.courseId!,req.params.assignmentId!,req.body,actor(req),'assignment')})
};
