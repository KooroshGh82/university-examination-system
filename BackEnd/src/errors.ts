import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) { res.status(err.status).json({ error: { code: err.code, message: err.message } }); return; }
  if (err instanceof ZodError) { res.status(422).json({ error: { code: 'VALIDATION', message: 'اطلاعات واردشده معتبر نیست.', details: err.flatten(issue => /[\u0600-\u06ff]/.test(issue.message) ? issue.message : 'مقدار واردشده معتبر نیست.') } }); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'این کد یا اطلاعات قبلاً ثبت شده است.' } }); return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2003','P2014'].includes(err.code)) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'به دلیل وجود اطلاعات مرتبط، انجام این عملیات ممکن نیست.' } }); return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'اطلاعات مورد نظر یافت نشد.' } }); return;
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') { res.status(400).json({error:{code:'VALIDATION',message:'ساختار اطلاعات ارسال‌شده معتبر نیست.'}}); return; }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'خطایی در سرور رخ داد؛ لطفاً دوباره تلاش کنید.' } });
};
