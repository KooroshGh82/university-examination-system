import type { Request,RequestHandler } from 'express';
import { examsService as s } from './exams.service.js';
const actor=(r:Request)=>({id:r.auth!.user.id,role:r.auth!.user.role});
export const examsController:Record<string,RequestHandler>={
  create:async(r,res)=>res.status(201).json({data:await s.create(r.body,actor(r))}),
  list:async(r,res)=>res.json({data:await s.list(r.query,actor(r))}),
  get:async(r,res)=>res.json({data:await s.get(r.params.examId!,actor(r))}),
  update:async(r,res)=>res.json({data:await s.update(r.params.examId!,r.body,actor(r))}),
  remove:async(r,res)=>{await s.remove(r.params.examId!,actor(r));res.sendStatus(204);},
  publish:async(r,res)=>res.json({data:await s.publish(r.params.examId!,actor(r))}),
  close:async(r,res)=>res.json({data:await s.close(r.params.examId!,actor(r))}),
  cancel:async(r,res)=>res.json({data:await s.cancel(r.params.examId!,actor(r))}),
  questions:async(r,res)=>res.json({data:{items:await s.questions(r.params.examId!,actor(r))}}),
  addQuestion:async(r,res)=>res.status(201).json({data:await s.addQuestion(r.params.examId!,r.body,actor(r))}),
  updateQuestion:async(r,res)=>res.json({data:await s.updateQuestion(r.params.examId!,r.params.questionId!,r.body,actor(r))}),
  removeQuestion:async(r,res)=>{await s.removeQuestion(r.params.examId!,r.params.questionId!,actor(r));res.sendStatus(204);},
  reorderQuestions:async(r,res)=>res.json({data:{items:await s.reorderQuestions(r.params.examId!,r.body,actor(r))}}),
  addOption:async(r,res)=>res.status(201).json({data:await s.addOption(r.params.examId!,r.params.questionId!,r.body,actor(r))}),
  updateOption:async(r,res)=>res.json({data:await s.updateOption(r.params.examId!,r.params.questionId!,r.params.optionId!,r.body,actor(r))}),
  removeOption:async(r,res)=>{await s.removeOption(r.params.examId!,r.params.questionId!,r.params.optionId!,actor(r));res.sendStatus(204);},
  setCorrect:async(r,res)=>res.json({data:await s.setCorrect(r.params.examId!,r.params.questionId!,r.params.optionId!,actor(r))})
};
