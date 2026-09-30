import { prisma } from '../../db/prisma.js';
export const gradesRepository={
  grade:(id:string)=>prisma.grade.findUnique({where:{id},include:{attempt:{include:{exam:{include:{course:true}}}}}}),
  publishedForStudent:(studentId:string,courseId?:string)=>prisma.grade.findMany({where:{status:'PUBLISHED',attempt:{studentId,...(courseId?{courseId}:{})}},
    include:{attempt:{include:{exam:{include:{course:true}}}}},orderBy:[{attempt:{exam:{startsAt:'asc'}}},{id:'asc'}]})
};
