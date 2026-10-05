import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../errors.js";
import { coursesRepository as repo } from "./courses.repository.js";
import {
  createCourse,
  patchCourse,
  linkStudent,
  linkProfessor,
  patchLink,
  courseListQuery,
  linkListQuery,
  uuid,
} from "./courses.schemas.js";

type Actor = { id: string; role: UserRole };
const missing = (what: string): never => {
  throw new AppError(404, "NOT_FOUND", "اطلاعات مورد نظر یافت نشد.");
};
const conflict = (message: string): never => {
  throw new AppError(409, "CONFLICT", message);
};
const audit = (
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  details?: object,
) => ({
  actorId: actor.id,
  action,
  entityType,
  entityId,
  details: details ?? Prisma.JsonNull,
});
const courseView = (c: {
  id: string;
  code: string;
  titleFa: string;
  termCode: string;
}) => ({ id: c.id, code: c.code, titleFa: c.titleFa, termCode: c.termCode });
const page = <T extends { id: string }>(items: T[], limit: number) => {
  const hasNext = items.length > limit;
  if (hasNext) items.pop();
  return { items, ...(hasNext ? { nextCursor: items.at(-1)!.id } : {}) };
};
const linkPage = <
  T extends { id: string; courseId: string; isActive: boolean },
>(
  items: T[],
  limit: number,
) => page(items, limit);
const parseCourse = (id: string) => uuid.parse(id);
const canSee = async (courseId: string, actor: Actor) => {
  if (actor.role === "ADMIN") return;
  const [enrollment, assignment] = await repo.courseLinks(courseId, actor.id);
  if (actor.role === "STUDENT" ? !enrollment : !assignment) missing("Course");
};
export const coursesService = {
  async create(body: unknown, actor: Actor) {
    const input = createCourse.parse(body);
    return prisma.$transaction(async (tx) => {
      const c = await tx.course.create({ data: input });
      if (actor.role === "PROFESSOR") {
        const assignment = await tx.professorAssignment.create({
          data: { courseId: c.id, professorId: actor.id },
        });
        await tx.auditEvent.create({
          data: audit(
            actor,
            "ASSIGNMENT_CREATED",
            "ProfessorAssignment",
            assignment.id,
            { courseId: c.id, professorId: actor.id },
          ),
        });
      }
      await tx.auditEvent.create({
        data: audit(actor, "COURSE_CREATED", "Course", c.id),
      });
      return courseView(c);
    });
  },
  async list(query: unknown, actor: Actor) {
    const q = courseListQuery.parse(query);
    const rows = await prisma.course.findMany({
      where: {
        ...(q.termCode ? { termCode: q.termCode } : {}),
        ...(actor.role === "STUDENT"
          ? { enrollments: { some: { studentId: actor.id } } }
          : {}),
        ...(actor.role === "PROFESSOR"
          ? { assignments: { some: { professorId: actor.id } } }
          : {}),
      },
      orderBy: { id: "asc" },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const p = page(rows, q.limit);
    return { ...p, items: p.items.map(courseView) };
  },
  async get(id: string, actor: Actor) {
    id = parseCourse(id);
    const c = (await repo.course(id)) ?? missing("Course");
    await canSee(id, actor);
    return courseView(c);
  },
  async update(id: string, body: unknown, actor: Actor) {
    id = parseCourse(id);
    const input = patchCourse.parse(body);
    return prisma.$transaction(async (tx) => {
      const c =
        (await tx.course.findUnique({ where: { id } })) ?? missing("Course");
      const updated = await tx.course.update({ where: { id }, data: input });
      await tx.auditEvent.create({
        data: audit(actor, "COURSE_UPDATED", "Course", id, {
          fields: Object.keys(input),
        }),
      });
      return courseView(updated);
    });
  },
  async remove(id: string, actor: Actor) {
    id = parseCourse(id);
    return prisma.$transaction(async (tx) => {
      const c =
        (await tx.course.findUnique({ where: { id } })) ?? missing("Course");
      const [enrollments, assignments, exams] = await Promise.all([
        tx.enrollment.count({ where: { courseId: id } }),
        tx.professorAssignment.count({ where: { courseId: id } }),
        tx.exam.count({ where: { courseId: id } }),
      ]);
      if (enrollments || assignments || exams)
        conflict("این درس سابقه آموزشی دارد و قابل حذف نیست.");
      await tx.course.delete({ where: { id } });
      await tx.auditEvent.create({
        data: audit(actor, "COURSE_DELETED", "Course", id, {
          code: c.code,
          termCode: c.termCode,
        }),
      });
    });
  },
  async ownCourses(
    actor: Actor,
    query: unknown,
    kind: "student" | "professor",
  ) {
    const q = courseListQuery.parse(query);
    const term = q.termCode ? { course: { termCode: q.termCode } } : {};
    const rows =
      kind === "student"
        ? await prisma.enrollment.findMany({
            where: { studentId: actor.id, ...term },
            include: { course: true },
            orderBy: { id: "asc" },
            take: q.limit + 1,
            ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
          })
        : await prisma.professorAssignment.findMany({
            where: { professorId: actor.id, ...term },
            include: { course: true },
            orderBy: { id: "asc" },
            take: q.limit + 1,
            ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
          });
    const p = page(
      rows.map((r) => ({ id: r.id, course: r.course, isActive: r.isActive })),
      q.limit,
    );
    return {
      ...p,
      items: p.items.map((r) => ({
        course: courseView(r.course),
        [kind === "student" ? "enrollmentId" : "assignmentId"]: r.id,
        isActive: r.isActive,
      })),
    };
  },
  async addEnrollment(courseId: string, body: unknown, actor: Actor) {
    courseId = parseCourse(courseId);
    const { studentId } = linkStudent.parse(body);
    return prisma.$transaction(async (tx) => {
      const [c, s, existing] = await Promise.all([
        tx.course.findUnique({ where: { id: courseId } }),
        tx.student.findUnique({
          where: { userId: studentId },
          include: { user: true },
        }),
        tx.enrollment.findUnique({
          where: { courseId_studentId: { courseId, studentId } },
        }),
      ]);
      if (!c) missing("Course");
      if (!s || !s.user.isActive) missing("Student");
      if (existing) conflict("این دانشجو قبلاً در درس ثبت شده است.");
      const link = await tx.enrollment.create({
        data: { courseId, studentId },
      });
      await tx.auditEvent.create({
        data: audit(actor, "ENROLLMENT_CREATED", "Enrollment", link.id, {
          courseId,
          studentId,
        }),
      });
      return link;
    });
  },
  async addAssignment(courseId: string, body: unknown, actor: Actor) {
    courseId = parseCourse(courseId);
    const { professorId } = linkProfessor.parse(body);
    return prisma.$transaction(async (tx) => {
      const [c, p, existing] = await Promise.all([
        tx.course.findUnique({ where: { id: courseId } }),
        tx.professor.findUnique({
          where: { userId: professorId },
          include: { user: true },
        }),
        tx.professorAssignment.findUnique({
          where: { courseId_professorId: { courseId, professorId } },
        }),
      ]);
      if (!c) missing("Course");
      if (!p || !p.user.isActive) missing("Professor");
      if (existing) conflict("این استاد قبلاً به درس تخصیص داده شده است.");
      const link = await tx.professorAssignment.create({
        data: { courseId, professorId },
      });
      await tx.auditEvent.create({
        data: audit(
          actor,
          "ASSIGNMENT_CREATED",
          "ProfessorAssignment",
          link.id,
          { courseId, professorId },
        ),
      });
      return link;
    });
  },
  async listLinks(
    courseId: string,
    query: unknown,
    kind: "enrollment" | "assignment",
  ) {
    courseId = parseCourse(courseId);
    const q = linkListQuery.parse(query);
    if (!(await repo.course(courseId))) missing("Course");
    const common = {
      where: {
        courseId,
        ...(q.isActive === undefined ? {} : { isActive: q.isActive }),
      },
      orderBy: { id: "asc" as const },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    };
    if (kind === "enrollment") {
      const p = linkPage(await prisma.enrollment.findMany(common), q.limit);
      return {
        ...p,
        items: p.items.map((r) => ({
          id: r.id,
          courseId: r.courseId,
          studentId: r.studentId,
          isActive: r.isActive,
        })),
      };
    }
    const p = linkPage(
      await prisma.professorAssignment.findMany(common),
      q.limit,
    );
    return {
      ...p,
      items: p.items.map((r) => ({
        id: r.id,
        courseId: r.courseId,
        professorId: r.professorId,
        isActive: r.isActive,
      })),
    };
  },
  async updateLink(
    courseId: string,
    linkId: string,
    body: unknown,
    actor: Actor,
    kind: "enrollment" | "assignment",
  ) {
    courseId = parseCourse(courseId);
    linkId = uuid.parse(linkId);
    const { isActive } = patchLink.parse(body);
    return prisma.$transaction(async (tx) => {
      if (kind === "enrollment") {
        const l =
          (await tx.enrollment.findUnique({ where: { id: linkId } })) ??
          missing("Enrollment");
        if (l.courseId !== courseId) missing("Enrollment");
        if (isActive) {
          const s = await tx.user.findUnique({ where: { id: l.studentId } });
          if (!s?.isActive) conflict("حساب دانشجو غیرفعال است.");
        }
        const updated = await tx.enrollment.update({
          where: { id: linkId },
          data: { isActive },
        });
        await tx.auditEvent.create({
          data: audit(
            actor,
            "ENROLLMENT_STATUS_CHANGED",
            "Enrollment",
            linkId,
            { isActive },
          ),
        });
        return updated;
      }
      const l =
        (await tx.professorAssignment.findUnique({ where: { id: linkId } })) ??
        missing("Assignment");
      if (l.courseId !== courseId) missing("Assignment");
      if (isActive) {
        const p = await tx.user.findUnique({ where: { id: l.professorId } });
        if (!p?.isActive) conflict("حساب استاد غیرفعال است.");
      }
      const updated = await tx.professorAssignment.update({
        where: { id: linkId },
        data: { isActive },
      });
      await tx.auditEvent.create({
        data: audit(
          actor,
          "ASSIGNMENT_STATUS_CHANGED",
          "ProfessorAssignment",
          linkId,
          { isActive },
        ),
      });
      return updated;
    });
  },
};
