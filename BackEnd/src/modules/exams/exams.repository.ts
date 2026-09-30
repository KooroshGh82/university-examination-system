import { prisma } from '../../db/prisma.js';
export const examsRepository = {
  assignment: (id:string) => prisma.professorAssignment.findUnique({where:{id}}),
  assignmentFor: (courseId:string,professorId:string) => prisma.professorAssignment.findUnique({where:{courseId_professorId:{courseId,professorId}}}),
  exam: (id:string) => prisma.exam.findUnique({where:{id}}),
  course: (id:string) => prisma.course.findUnique({where:{id}}),
  enrollment: (courseId:string,studentId:string) => prisma.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId}}})
};
