import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { authController } from './auth.controller.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors.js';
import { rateLimit } from 'express-rate-limit';
const router = Router();
// Cookie endpoints require an exact Origin to prevent cross-site form requests.
const cookieOrigin: import('express').RequestHandler = (req,_res,next) => req.header('origin') === env.APP_ORIGIN ? next() : next(new AppError(403,'FORBIDDEN','Invalid request origin'));
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const refreshLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
router.post('/login', cookieOrigin, loginLimit, asyncRoute(authController.login!));
router.post('/refresh', cookieOrigin, refreshLimit, asyncRoute(authController.refresh!));
router.post('/logout', cookieOrigin, asyncRoute(authController.logout!));
router.post('/change-password', authenticate, requireRole('STUDENT','PROFESSOR'), loginLimit, asyncRoute(authController.changePassword!));
router.get('/me', authenticate, asyncRoute(authController.me!));
export default router;
