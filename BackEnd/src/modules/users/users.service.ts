import { hashPassword, publicUser } from '../auth/auth.service.js';
import { provisionSchema } from '../../validation/auth.js';
import { usersRepository } from './users.repository.js';
export const usersService = {
  async provision(role: 'STUDENT'|'PROFESSOR', body: unknown) {
    const input = provisionSchema.parse(body);
    const user = await usersRepository.createProvisioned({ role, universityId: input.universityId, fullName: input.fullName, passwordHash: await hashPassword('123456') });
    return publicUser(user);
  }
};
