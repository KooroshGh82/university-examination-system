import type { RequestHandler } from 'express';
import type { User, UserRole } from '@prisma/client';
import { AppError } from '../errors.js';
import { authService, verifyAccess } from '../modules/auth/auth.service.js';
import { prisma } from '../db/prisma.js';

declare global { namespace Express { interface Request { auth?: { user: User; sid: string } } } }
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Bearer token required');
    const claims = verifyAccess(header.slice(7));
    const user = await authService.getActiveUser(claims.sub!, claims.sid);
    if (claims.role !== user.role) throw new AppError(401, 'UNAUTHENTICATED', 'Session role changed');
    req.auth = { user, sid: claims.sid }; next();
  } catch (e) { next(e); }
};
export const requireRole = (...roles: UserRole[]): RequestHandler => (req, _res, next) =>
  !req.auth ? next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required')) :
  !roles.includes(req.auth.user.role) ? next(new AppError(403, 'FORBIDDEN', 'Role is not authorized')) : next();
export const requireStudent: RequestHandler = requireRole('STUDENT');
export const requireProfessor: RequestHandler = requireRole('PROFESSOR');
export const requireSelfStudent = (key = 'studentId'): RequestHandler => (req, _res, next) =>
  req.auth?.user.role === 'STUDENT' && req.auth.user.id === req.params[key] ? next() : next(new AppError(404, 'NOT_FOUND', 'Student not found'));
export const requireAssignedCourse = (key = 'courseId'): RequestHandler => async (req, _res, next) => {
  try {
    if (req.auth?.user.role !== 'PROFESSOR') throw new AppError(403, 'FORBIDDEN', 'Professor required');
    const link = await prisma.professorAssignment.findUnique({ where: { courseId_professorId: { courseId: req.params[key]!, professorId: req.auth.user.id } } });
    if (!link?.isActive) throw new AppError(404, 'NOT_FOUND', 'Course not found');
    next();
  } catch (e) { next(e); }
};
export const requireEnrolledCourse = (key = 'courseId'): RequestHandler => async (req, _res, next) => {
  try {
    if (req.auth?.user.role !== 'STUDENT') throw new AppError(403, 'FORBIDDEN', 'Student required');
    const link = await prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId: req.params[key]!, studentId: req.auth.user.id } } });
    if (!link?.isActive) throw new AppError(404, 'NOT_FOUND', 'Course not found');
    next();
  } catch (e) { next(e); }
};
