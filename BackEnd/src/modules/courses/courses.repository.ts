import { prisma } from "../../db/prisma.js";
export const coursesRepository = {
  course: (id: string) => prisma.course.findUnique({ where: { id } }),
  student: (id: string) =>
    prisma.student.findUnique({
      where: { userId: id },
      include: { user: { select: { isActive: true } } },
    }),
  professor: (id: string) =>
    prisma.professor.findUnique({
      where: { userId: id },
      include: { user: { select: { isActive: true } } },
    }),
  enrollment: (id: string) => prisma.enrollment.findUnique({ where: { id } }),
  assignment: (id: string) =>
    prisma.professorAssignment.findUnique({ where: { id } }),
  enrollmentByPair: (courseId: string, studentId: string) =>
    prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    }),
  assignmentByPair: (courseId: string, professorId: string) =>
    prisma.professorAssignment.findUnique({
      where: { courseId_professorId: { courseId, professorId } },
    }),
  courseLinks: (courseId: string, userId: string) =>
    Promise.all([
      prisma.enrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: userId } },
      }),
      prisma.professorAssignment.findUnique({
        where: { courseId_professorId: { courseId, professorId: userId } },
      }),
    ]),
};
