import { prisma } from '../../db/prisma.js';
export const submissionsRepository={
  exam:(id:string)=>prisma.exam.findUnique({where:{id}}),
  attempt:(id:string)=>prisma.examAttempt.findUnique({where:{id},include:{exam:true}}),
  gradeForAttempt:(id:string)=>prisma.grade.findUnique({where:{attemptId:id}})
};
