import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../../errors.js';
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0,parts:1}}).single('file');
export const acceptFile:RequestHandler=(req,res,next)=>upload(req,res,err=>{
  if(err instanceof multer.MulterError){next(new AppError(err.code==='LIMIT_FILE_SIZE'?413:422,err.code==='LIMIT_FILE_SIZE'?'PAYLOAD_TOO_LARGE':'INVALID_UPLOAD','Invalid or oversized upload'));return;}
  if(err){next(err);return;}
  if(!req.file){next(new AppError(422,'FILE_REQUIRED','Multipart field file is required'));return;}
  next();
});
