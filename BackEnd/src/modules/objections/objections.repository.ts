import { prisma } from "../../db/prisma.js";
export const objectionsRepository = {
  grade: (id: string) =>
    prisma.grade.findUnique({
      where: { id },
      include: { attempt: { include: { exam: true } } },
    }),
  objection: (id: string) =>
    prisma.gradeObjection.findUnique({
      where: { id },
      include: {
        decision: true,
        student: {
          select: { user: { select: { fullName: true, universityId: true } } },
        },
        grade: { include: { attempt: { include: { exam: true } } } },
      },
    }),
};
