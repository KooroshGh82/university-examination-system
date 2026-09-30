import { z } from 'zod';
export const uuid=z.string().uuid();
const message=z.string().trim().min(1).max(10000);
export const submitBody=z.object({reasonFa:message}).strict();
export const decisionBody=z.object({responseFa:message,newScore:z.string().regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/).optional()}).strict();
export const listQuery=z.object({gradeId:uuid.optional(),examId:uuid.optional(),status:z.enum(['SUBMITTED','UNDER_REVIEW','CONFIRMED','CHANGED']).optional(),limit:z.coerce.number().int().min(1).max(100).default(20),cursor:uuid.optional()}).strict();
