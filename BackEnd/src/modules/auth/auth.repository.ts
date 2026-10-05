import { prisma } from "../../db/prisma.js";
export const authRepository = {
  findByUniversityId: (universityId: string) =>
    prisma.user.findUnique({
      where: { universityId },
      include: { student: true, professor: true },
    }),
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { student: true, professor: true },
    }),
  findSession: (id: string) => prisma.authSession.findUnique({ where: { id } }),
};
