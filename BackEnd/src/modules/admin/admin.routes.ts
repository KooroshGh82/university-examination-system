import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../../db/prisma.js';
import {requireRole} from '../../middleware/authenticate.js';
import {asyncRoute} from '../../middleware/asyncRoute.js';
import {AppError} from '../../errors.js';
import {publicUser} from '../auth/auth.service.js';
const r=Router();r.use(requireRole('ADMIN'));
const uuid=z.string().uuid();
r.get('/students',asyncRoute(async (_req,res)=>{res.json({data:await prisma.user.findMany({where:{role:'STUDENT',isActive:true},orderBy:{universityId:'asc'}}).then(users=>users.map(publicUser))})}));
r.get('/exams',asyncRoute(async (_req,res)=>{res.json({data:await prisma.exam.findMany({include:{course:true,professor:{include:{user:true}},_count:{select:{participants:true}}},orderBy:{createdAt:'desc'}}).then(exams=>exams.map(e=>({id:e.id,titleFa:e.titleFa,status:e.status,course:e.course,professor:publicUser(e.professor.user),participantCount:e._count.participants})))})}));
r.get('/exams/:examId/students',asyncRoute(async (req,res)=>{const examId=uuid.parse(req.params.examId);if(!await prisma.exam.findUnique({where:{id:examId}}))throw new AppError(404,'NOT_FOUND','Exam not found');res.json({data:await prisma.examParticipant.findMany({where:{examId},include:{student:{include:{user:true}}}}).then(rows=>rows.map(row=>publicUser(row.student.user)))})}));
r.post('/exams/:examId/students',asyncRoute(async (req,res)=>{
 const examId=uuid.parse(req.params.examId);const {studentIds}=z.object({studentIds:z.array(uuid).min(1).max(500)}).strict().parse(req.body);const ids=[...new Set(studentIds)];
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR UPDATE`;
  const exam=await tx.exam.findUnique({where:{id:examId}});if(!exam)throw new AppError(404,'NOT_FOUND','Exam not found');
  if(exam.status==='CANCELLED')throw new AppError(409,'CONFLICT','Cannot assign a cancelled exam');
  const students=await tx.student.count({where:{userId:{in:ids},user:{isActive:true,role:'STUDENT'}}});if(students!==ids.length)throw new AppError(422,'INVALID_STUDENTS','Select active students');
  for(const studentId of ids)await tx.enrollment.upsert({where:{courseId_studentId:{courseId:exam.courseId,studentId}},create:{courseId:exam.courseId,studentId},update:{isActive:true}});
  await tx.examParticipant.createMany({data:ids.map(studentId=>({examId,studentId})),skipDuplicates:true});
  await tx.auditEvent.create({data:{actorId:req.auth!.user.id,action:'EXAM_STUDENTS_ASSIGNED',entityType:'Exam',entityId:examId,details:{studentIds:ids}}});
 });res.sendStatus(204);
}));
r.delete('/exams/:examId/students/:studentId',asyncRoute(async(req,res)=>{
 const examId=uuid.parse(req.params.examId),studentId=uuid.parse(req.params.studentId);
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM exams WHERE id = ${examId}::uuid FOR UPDATE`;
  if(await tx.examAttempt.count({where:{examId,studentId}}))throw new AppError(409,'CONFLICT','Cannot remove a student who has started the exam');
  await tx.examParticipant.deleteMany({where:{examId,studentId}});
  await tx.auditEvent.create({data:{actorId:req.auth!.user.id,action:'EXAM_STUDENT_REMOVED',entityType:'Exam',entityId:examId,details:{studentId}}});
 });res.sendStatus(204);
}));
export default r;
