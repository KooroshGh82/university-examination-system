import type { RequestHandler } from 'express';
import { usersService } from './users.service.js';
import { publicUser } from '../auth/auth.service.js';
export const usersController: Record<string, RequestHandler> = {
  createStudent: async (req,res) => { res.status(201).json({ data: await usersService.provision('STUDENT', req.body) }); },
  createProfessor: async (req,res) => { res.status(201).json({ data: await usersService.provision('PROFESSOR', req.body) }); },
  ownProfile: (req,res) => { res.json({ data: publicUser(req.auth!.user) }); }
};
