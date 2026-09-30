import { z } from 'zod';

export const uuid = z.string().uuid();
const name = (max: number) => z.string().trim().min(1).max(max);
export const createCourse = z.object({ code: name(32), titleFa: name(200), termCode: name(32) }).strict();
export const patchCourse = createCourse.partial().refine(v => Object.keys(v).length > 0, 'At least one field is required');
export const linkStudent = z.object({ studentId: uuid }).strict();
export const linkProfessor = z.object({ professorId: uuid }).strict();
export const patchLink = z.object({ isActive: z.boolean() }).strict();
export const listQuery = z.object({
  termCode: name(32).optional(),
  isActive: z.enum(['true','false']).transform(v => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: uuid.optional()
}).strict();
export const courseListQuery = listQuery.omit({ isActive: true });
export const linkListQuery = listQuery.omit({ termCode: true });
