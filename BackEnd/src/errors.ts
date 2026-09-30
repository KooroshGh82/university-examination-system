import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) { res.status(err.status).json({ error: { code: err.code, message: err.message } }); return; }
  if (err instanceof ZodError) { res.status(422).json({ error: { code: 'VALIDATION', message: 'Invalid request', details: err.flatten() } }); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A unique value already exists' } }); return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2003','P2014'].includes(err.code)) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource has related records' } }); return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }); return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
