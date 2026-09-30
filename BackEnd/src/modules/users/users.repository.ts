import { prisma } from '../../db/prisma.js';
export const usersRepository = {
  createProvisioned: (input: { universityId: string; email?: string; fullName: string; passwordHash: string; role: 'STUDENT'|'PROFESSOR' }) =>
    prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { universityId: input.universityId, email: input.email, fullName: input.fullName, passwordHash: input.passwordHash, role: input.role } });
      if (input.role === 'STUDENT') await tx.student.create({ data: { userId: user.id } });
      else await tx.professor.create({ data: { userId: user.id } });
      return user;
    })
};
