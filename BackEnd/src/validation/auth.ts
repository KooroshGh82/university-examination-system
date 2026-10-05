import { z } from 'zod';
const normalizeDigits=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
export const loginSchema = z.object({ universityId: z.string().trim().min(1).max(64).transform(normalizeDigits), password: z.string().min(1).max(1024) }).strict();
export const provisionSchema = z.object({
  universityId: z.string().trim().min(1).max(64).transform(normalizeDigits).pipe(z.string().regex(/^[0-9]+$/, 'کد باید فقط شامل عدد باشد.')),
  fullName: z.string().trim().min(1).max(200).regex(/^\p{L}[\p{L}\p{M} '\u200c\u2019-]*$/u, 'نام باید فقط شامل حروف باشد و نباید عدد داشته باشد.')
}).strict();
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(6).max(128).refine(value=>value!=='123456','گذرواژه جدید نمی‌تواند گذرواژه پیش‌فرض باشد.')
}).strict().refine(input => input.currentPassword !== input.newPassword, {
  message: 'New password must differ from current password', path: ['newPassword']
});
