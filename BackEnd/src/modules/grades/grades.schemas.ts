import { z } from "zod";
export const uuid = z.string().uuid();
export const gradeList = z
  .object({
    courseId: uuid.optional(),
    examId: uuid.optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: uuid.optional(),
  })
  .strict();
export const performanceQuery = z
  .object({ courseId: uuid.optional() })
  .strict();
export const historyQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: uuid.optional(),
  })
  .strict();
