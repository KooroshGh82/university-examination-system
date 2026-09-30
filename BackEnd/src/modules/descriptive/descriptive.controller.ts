import type {RequestHandler} from 'express';
import {descriptiveService} from './descriptive.service.js';
export const descriptiveController:Record<string,RequestHandler>={
  saveGrade:async(req,res)=>res.json({data:await descriptiveService.saveGrade(req.params.attemptId!,req.auth!.user.id,req.body)})
};
