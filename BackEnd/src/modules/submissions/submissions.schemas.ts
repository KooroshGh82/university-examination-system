import { z } from 'zod';
export const uuid=z.string().uuid();
export const answerBody=z.object({optionId:uuid.nullable()}).strict();
export const listAttempts=z.object({examId:uuid.optional(),status:z.enum(['IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED','ABSENT']).optional(),limit:z.coerce.number().int().min(1).max(100).default(20),cursor:uuid.optional()}).strict();
