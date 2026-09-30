import { z } from 'zod';
export const loginSchema = z.object({ universityId: z.string().trim().min(1).max(64), password: z.string().min(1).max(1024) }).strict();
export const provisionSchema = z.object({
  universityId: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(1).max(200)
}).strict();
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(6).max(128)
}).strict().refine(input => input.currentPassword !== input.newPassword, {
  message: 'New password must differ from current password', path: ['newPassword']
});
