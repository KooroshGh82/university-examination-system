import { z } from 'zod';
export const uuid=z.string().uuid();
export const gradeBody=z.object({score:z.string().regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/),commentsFa:z.string().trim().max(10000).nullable().optional()}).strict();
