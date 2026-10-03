import { z } from 'zod';
export const uuid = z.string().uuid();
const nonblank = (max:number) => z.string().trim().min(1).max(max);
const timestamp = z.string().datetime({offset:true}).transform(v=>new Date(v));
const decimal = z.string().regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/, 'عدد را با حداکثر دو رقم اعشار وارد کنید.');
export const createExam = z.object({
  courseId:uuid, assignmentId:uuid.optional(), titleFa:nonblank(200), instructionsFa:z.string().trim().max(10000).nullable().optional(),
  type:z.enum(['MULTIPLE_CHOICE','DESCRIPTIVE']), startsAt:timestamp, endsAt:timestamp,
  durationMinutes:z.number().int().positive().max(10080).nullable().optional(), maxPoints:decimal.refine(v=>Number(v)>0)
}).strict().refine(v=>v.endsAt>v.startsAt,{path:['endsAt'],message:'زمان پایان باید بعد از زمان شروع باشد.'});
export const updateExam = z.object({
  titleFa:nonblank(200).optional(), instructionsFa:z.string().trim().max(10000).nullable().optional(),
  startsAt:timestamp.optional(), endsAt:timestamp.optional(), durationMinutes:z.number().int().positive().max(10080).nullable().optional(),
  maxPoints:decimal.refine(v=>Number(v)>0).optional()
}).strict().refine(v=>Object.keys(v).length>0,'حداقل یک مورد را وارد کنید.');
export const questionCreate = z.object({promptFa:nonblank(20000),points:decimal.refine(v=>Number(v)>0),authorOrder:z.number().int().positive()}).strict();
export const questionUpdate = questionCreate.partial().refine(v=>Object.keys(v).length>0,'حداقل یک مورد را وارد کنید.');
export const reorder = z.object({questionIds:z.array(uuid).min(1).max(500)}).strict().refine(v=>new Set(v.questionIds).size===v.questionIds.length,'سؤال تکراری در فهرست وجود دارد.');
export const optionCreate = z.object({textFa:nonblank(5000),position:z.number().int().positive(),isCorrect:z.boolean().default(false)}).strict();
export const optionUpdate = z.object({textFa:nonblank(5000).optional(),position:z.number().int().positive().optional(),isCorrect:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0,'حداقل یک مورد را وارد کنید.');
export const listExams = z.object({courseId:uuid.optional(),status:z.enum(['DRAFT','PUBLISHED','CANCELLED']).optional(),type:z.enum(['MULTIPLE_CHOICE','DESCRIPTIVE']).optional(),limit:z.coerce.number().int().min(1).max(100).default(20),cursor:uuid.optional()}).strict();
