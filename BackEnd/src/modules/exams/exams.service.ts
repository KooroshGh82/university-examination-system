import { Prisma, type Exam, type UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../errors.js";
import { examsRepository as repo } from "./exams.repository.js";
import {
  createExam,
  updateExam,
  questionCreate,
  questionUpdate,
  reorder,
  optionCreate,
  optionUpdate,
  listExams,
  uuid,
} from "./exams.schemas.js";

type Actor = { id: string; role: UserRole };
type Tx = Prisma.TransactionClient;
const missing = (name: string): never => {
  throw new AppError(404, "NOT_FOUND", "اطلاعات مورد نظر یافت نشد.");
};
const conflict = (message: string): never => {
  throw new AppError(409, "CONFLICT", message);
};
const invalid = (message: string): never => {
  throw new AppError(422, "INVALID_EXAM_CONTENT", message);
};
const examView = (e: Exam) => ({
  id: e.id,
  courseId: e.courseId,
  professorId: e.professorId,
  assignmentId: e.assignmentId,
  titleFa: e.titleFa,
  instructionsFa: e.instructionsFa,
  type: e.type,
  status: e.status,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  durationMinutes: e.durationMinutes,
  maxPoints: e.maxPoints.toString(),
  publishedAt: e.publishedAt,
  createdAt: e.createdAt,
});
const questionView = (q: {
  id: string;
  examId: string;
  promptFa: string;
  points: Prisma.Decimal;
  authorOrder: number;
  options?: {
    id: string;
    questionId: string;
    textFa: string;
    position: number;
    isCorrect: boolean;
  }[];
}) => ({
  id: q.id,
  examId: q.examId,
  promptFa: q.promptFa,
  points: q.points.toString(),
  authorOrder: q.authorOrder,
  ...(q.options ? { options: q.options.map(optionView) } : {}),
});
const optionView = (o: {
  id: string;
  questionId: string;
  textFa: string;
  position: number;
  isCorrect: boolean;
}) => ({
  id: o.id,
  questionId: o.questionId,
  textFa: o.textFa,
  position: o.position,
  isCorrect: o.isCorrect,
});
const audit = (
  tx: Tx,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  details?: object,
) =>
  tx.auditEvent.create({
    data: {
      actorId: actor.id,
      action,
      entityType,
      entityId,
      details: details ?? Prisma.JsonNull,
    },
  });
const dbNow = async (tx: Tx) => {
  const rows = await tx.$queryRaw<
    { now: Date }[]
  >`SELECT clock_timestamp() AS now`;
  return rows[0]!.now;
};
const lockExam = async (tx: Tx, id: string) => {
  await tx.$queryRaw`SELECT id FROM exams WHERE id = ${id}::uuid FOR UPDATE`;
  return (await tx.exam.findUnique({ where: { id } })) ?? missing("Exam");
};
const manage = async (tx: Tx, e: Exam, actor: Actor) => {
  if (actor.role === "STUDENT") missing("Exam");
  const a = await tx.professorAssignment.findUnique({
    where: { id: e.assignmentId },
  });
  if (
    !a?.isActive ||
    a.courseId !== e.courseId ||
    a.professorId !== e.professorId ||
    (actor.role === "PROFESSOR" && e.professorId !== actor.id)
  )
    missing("Exam");
};
const draft = (e: Exam) => {
  if (e.status !== "DRAFT")
    conflict("پس از انتشار، محتوای آزمون قابل تغییر نیست.");
};
const existingQuestion = async (tx: Tx, e: Exam, id: string) => {
  const q = await tx.examQuestion.findUnique({ where: { id } });
  if (q?.examId !== e.id) missing("Question");
  return q ?? missing("Question");
};
const existingOption = async (tx: Tx, questionId: string, id: string) => {
  const o = await tx.multipleChoiceOption.findUnique({ where: { id } });
  if (o?.questionId !== questionId) missing("Option");
  return o ?? missing("Option");
};
const withDraft = <T>(
  id: string,
  actor: Actor,
  fn: (tx: Tx, e: Exam) => Promise<T>,
) =>
  prisma.$transaction(async (tx) => {
    const e = await lockExam(tx, uuid.parse(id));
    await manage(tx, e, actor);
    draft(e);
    return fn(tx, e);
  });
const pagination = <T extends { id: string }>(rows: T[], limit: number) => {
  const more = rows.length > limit;
  if (more) rows.pop();
  return { items: rows, ...(more ? { nextCursor: rows.at(-1)!.id } : {}) };
};
export const examsService = {
  async create(body: unknown, actor: Actor) {
    const input = createExam.parse(body);
    return prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: input.courseId },
      });
      if (!course) missing("Course");
      const assignment =
        actor.role === "PROFESSOR"
          ? await tx.professorAssignment.findUnique({
              where: {
                courseId_professorId: {
                  courseId: input.courseId,
                  professorId: actor.id,
                },
              },
            })
          : input.assignmentId
            ? await tx.professorAssignment.findUnique({
                where: { id: input.assignmentId },
              })
            : null;
      if (
        !assignment?.isActive ||
        assignment.courseId !== input.courseId ||
        (actor.role === "PROFESSOR" && assignment.professorId !== actor.id)
      )
        throw new AppError(
          403,
          "ASSIGNMENT_REQUIRED",
          "برای ایجاد آزمون باید به این درس تخصیص داده شده باشید.",
        );
      const e = await tx.exam.create({
        data: {
          courseId: input.courseId,
          assignmentId: assignment.id,
          professorId: assignment.professorId,
          createdByAdminId: actor.role === "ADMIN" ? actor.id : null,
          titleFa: input.titleFa,
          instructionsFa: input.instructionsFa,
          type: input.type,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          durationMinutes: input.durationMinutes,
          maxPoints: input.maxPoints,
        },
      });
      await audit(tx, actor, "EXAM_CREATED", "Exam", e.id);
      return examView(e);
    });
  },
  async list(query: unknown, actor: Actor) {
    const q = listExams.parse(query);
    if (actor.role === "STUDENT" && q.status && q.status !== "PUBLISHED")
      return { items: [] };
    const rows = await prisma.exam.findMany({
      where: {
        ...(q.courseId ? { courseId: q.courseId } : {}),
        ...(q.type ? { type: q.type } : {}),
        status: actor.role === "STUDENT" ? "PUBLISHED" : q.status,
        ...(actor.role === "STUDENT"
          ? {
              participants: { some: { studentId: actor.id } },
              course: {
                enrollments: { some: { studentId: actor.id, isActive: true } },
              },
            }
          : {}),
        ...(actor.role === "PROFESSOR"
          ? { professorId: actor.id, assignment: { isActive: true } }
          : {}),
      },
      orderBy: { id: "asc" },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const p = pagination(rows, q.limit);
    return { ...p, items: p.items.map(examView) };
  },
  async get(id: string, actor: Actor) {
    const e = (await repo.exam(uuid.parse(id))) ?? missing("Exam");
    if (actor.role === "STUDENT") {
      if (
        !(await prisma.examParticipant.findUnique({
          where: { examId_studentId: { examId: e.id, studentId: actor.id } },
        })) ||
        e.status !== "PUBLISHED" ||
        !(await repo.enrollment(e.courseId, actor.id))?.isActive
      )
        missing("Exam");
    } else if (actor.role === "PROFESSOR") {
      if (
        e.professorId !== actor.id ||
        !(await repo.assignment(e.assignmentId))?.isActive
      )
        missing("Exam");
    }
    return examView(e);
  },
  async update(id: string, body: unknown, actor: Actor) {
    const input = updateExam.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      const start = input.startsAt ?? e.startsAt,
        end = input.endsAt ?? e.endsAt;
      if (end <= start) invalid("زمان پایان باید بعد از زمان شروع باشد.");
      const updated = await tx.exam.update({
        where: { id: e.id },
        data: input,
      });
      await audit(tx, actor, "EXAM_UPDATED", "Exam", e.id, {
        fields: Object.keys(input),
      });
      return examView(updated);
    });
  },
  async remove(id: string, actor: Actor) {
    return withDraft(id, actor, async (tx, e) => {
      const [attempts, files] = await Promise.all([
        tx.examAttempt.count({ where: { examId: e.id } }),
        tx.storedFile.count({ where: { examId: e.id } }),
      ]);
      if (attempts || files)
        conflict("این آزمون پاسخ‌نامه یا فایل دارد و قابل حذف نیست.");
      const qs = await tx.examQuestion.findMany({
        where: { examId: e.id },
        select: { id: true },
      });
      await tx.multipleChoiceOption.deleteMany({
        where: { questionId: { in: qs.map((q) => q.id) } },
      });
      await tx.examQuestion.deleteMany({ where: { examId: e.id } });
      await tx.exam.delete({ where: { id: e.id } });
      await audit(tx, actor, "EXAM_DELETED", "Exam", e.id, {
        titleFa: e.titleFa,
      });
    });
  },
  async publish(id: string, actor: Actor) {
    return withDraft(id, actor, async (tx, e) => {
      const now = await dbNow(tx);
      if (e.endsAt <= now)
        conflict("زمان پایان آزمون گذشته است و امکان انتشار وجود ندارد.");
      const qs = await tx.examQuestion.findMany({
        where: { examId: e.id },
        include: { options: true },
      });
      const files = await tx.storedFile.count({
        where: { examId: e.id, kind: "EXAM_QUESTION", purgedAt: null },
      });
      if (!qs.length && !(e.type === "DESCRIPTIVE" && files))
        invalid("ابتدا سؤال‌ها یا فایل سؤال تشریحی را اضافه کنید.");
      if (e.type === "MULTIPLE_CHOICE") {
        if (!qs.length)
          invalid("برای آزمون چهارگزینه‌ای باید سؤال اضافه کنید.");
        for (const q of qs) {
          if (
            q.points.lte(0) ||
            q.options.length < 2 ||
            q.options.filter((o) => o.isCorrect).length !== 1
          )
            invalid(
              "هر سؤال باید نمره مثبت، حداقل دو گزینه و دقیقاً یک پاسخ صحیح داشته باشد.",
            );
        }
      } else {
        if (qs.some((q) => q.options.length))
          invalid("سؤال تشریحی نمی‌تواند گزینه چهارگزینه‌ای داشته باشد.");
        if (qs.some((q) => q.points.lte(0)))
          invalid("نمره سؤال‌های تشریحی باید بیشتر از صفر باشد.");
      }
      if (
        qs.length &&
        qs
          .reduce((sum, q) => sum.plus(q.points), new Prisma.Decimal(0))
          .comparedTo(e.maxPoints) !== 0
      )
        invalid("مجموع نمره سؤال‌ها باید برابر نمره کل آزمون باشد.");
      const updated = await tx.exam.update({
        where: { id: e.id },
        data: { status: "PUBLISHED", publishedAt: now },
      });
      await audit(tx, actor, "EXAM_PUBLISHED", "Exam", e.id);
      return examView(updated);
    });
  },
  async close(id: string, actor: Actor) {
    return prisma.$transaction(async (tx) => {
      const e = await lockExam(tx, uuid.parse(id));
      await manage(tx, e, actor);
      if (e.status !== "PUBLISHED")
        conflict("فقط آزمون منتشرشده قابل پایان دادن است.");
      const now = await dbNow(tx);
      if (now <= e.startsAt)
        conflict("آزمون هنوز شروع نشده است؛ می‌توانید آن را لغو کنید.");
      if (now >= e.endsAt) return examView(e);
      const updated = await tx.exam.update({
        where: { id: e.id },
        data: { endsAt: now },
      });
      await tx.examAttempt.updateMany({
        where: { examId: e.id, status: "IN_PROGRESS", deadlineAt: { gt: now } },
        data: { deadlineAt: now },
      });
      await audit(tx, actor, "EXAM_CLOSED", "Exam", e.id, {
        effectiveEndAt: now.toISOString(),
      });
      return examView(updated);
    });
  },
  async cancel(id: string, actor: Actor) {
    return prisma.$transaction(async (tx) => {
      const e = await lockExam(tx, uuid.parse(id));
      await manage(tx, e, actor);
      if (e.status === "CANCELLED") conflict("این آزمون قبلاً لغو شده است.");
      if (await tx.examAttempt.count({ where: { examId: e.id } }))
        conflict(
          "آزمونی که دانشجویان شروع کرده‌اند قابل لغو نیست؛ آن را پایان دهید.",
        );
      const updated = await tx.exam.update({
        where: { id: e.id },
        data: { status: "CANCELLED" },
      });
      await audit(tx, actor, "EXAM_CANCELLED", "Exam", e.id);
      return examView(updated);
    });
  },
  async questions(id: string, actor: Actor) {
    const e = (await repo.exam(uuid.parse(id))) ?? missing("Exam");
    if (actor.role === "STUDENT") missing("Exam");
    const a = await repo.assignment(e.assignmentId);
    if (
      !a?.isActive ||
      (actor.role === "PROFESSOR" && a.professorId !== actor.id)
    )
      missing("Exam");
    const qs = await prisma.examQuestion.findMany({
      where: { examId: e.id },
      include: { options: { orderBy: { position: "asc" } } },
      orderBy: { authorOrder: "asc" },
    });
    return qs.map(questionView);
  },
  async addQuestion(id: string, body: unknown, actor: Actor) {
    const input = questionCreate.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      const q = await tx.examQuestion.create({
        data: { examId: e.id, ...input },
      });
      await audit(tx, actor, "QUESTION_CREATED", "ExamQuestion", q.id, {
        examId: e.id,
      });
      return questionView(q);
    });
  },
  async updateQuestion(id: string, qid: string, body: unknown, actor: Actor) {
    const input = questionUpdate.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      const updated = await tx.examQuestion.update({
        where: { id: q.id },
        data: input,
      });
      await audit(tx, actor, "QUESTION_UPDATED", "ExamQuestion", q.id, {
        fields: Object.keys(input),
      });
      return questionView(updated);
    });
  },
  async removeQuestion(id: string, qid: string, actor: Actor) {
    return withDraft(id, actor, async (tx, e) => {
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      if (await tx.attemptQuestion.count({ where: { questionId: q.id } }))
        conflict("این سؤال در پاسخ‌نامه استفاده شده و قابل حذف نیست.");
      await tx.multipleChoiceOption.deleteMany({ where: { questionId: q.id } });
      await tx.examQuestion.delete({ where: { id: q.id } });
      await audit(tx, actor, "QUESTION_DELETED", "ExamQuestion", q.id, {
        examId: e.id,
      });
    });
  },
  async reorderQuestions(id: string, body: unknown, actor: Actor) {
    const { questionIds } = reorder.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      const qs = await tx.examQuestion.findMany({
        where: { examId: e.id },
        select: { id: true, authorOrder: true },
      });
      if (
        qs.length !== questionIds.length ||
        qs.some((q) => !questionIds.includes(q.id))
      )
        invalid("هر سؤال را دقیقاً یک بار در ترتیب سؤال‌ها قرار دهید.");
      const max = Math.max(0, ...qs.map((q) => q.authorOrder));
      for (let i = 0; i < questionIds.length; i++)
        await tx.examQuestion.update({
          where: { id: questionIds[i]! },
          data: { authorOrder: max + i + 1 },
        });
      for (let i = 0; i < questionIds.length; i++)
        await tx.examQuestion.update({
          where: { id: questionIds[i]! },
          data: { authorOrder: i + 1 },
        });
      await audit(tx, actor, "QUESTIONS_REORDERED", "Exam", e.id);
      const ordered = await tx.examQuestion.findMany({
        where: { examId: e.id },
        orderBy: { authorOrder: "asc" },
      });
      return ordered.map(questionView);
    });
  },
  async addOption(id: string, qid: string, body: unknown, actor: Actor) {
    const input = optionCreate.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      if (e.type !== "MULTIPLE_CHOICE")
        invalid("فقط سؤال‌های چهارگزینه‌ای می‌توانند گزینه داشته باشند.");
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      if (
        input.isCorrect &&
        (await tx.multipleChoiceOption.count({
          where: { questionId: q.id, isCorrect: true },
        }))
      )
        conflict(
          "این سؤال پاسخ صحیح دارد؛ پاسخ صحیح را از گزینه مربوط تغییر دهید.",
        );
      const o = await tx.multipleChoiceOption.create({
        data: { questionId: q.id, ...input },
      });
      await audit(tx, actor, "OPTION_CREATED", "MultipleChoiceOption", o.id, {
        questionId: q.id,
      });
      return optionView(o);
    });
  },
  async updateOption(
    id: string,
    qid: string,
    oid: string,
    body: unknown,
    actor: Actor,
  ) {
    const input = optionUpdate.parse(body);
    return withDraft(id, actor, async (tx, e) => {
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      const o = await existingOption(tx, q.id, uuid.parse(oid));
      if (
        input.isCorrect &&
        !o.isCorrect &&
        (await tx.multipleChoiceOption.count({
          where: { questionId: q.id, isCorrect: true },
        }))
      )
        conflict("پاسخ صحیح را از گزینه انتخاب پاسخ درست تغییر دهید.");
      const updated = await tx.multipleChoiceOption.update({
        where: { id: o.id },
        data: input,
      });
      await audit(tx, actor, "OPTION_UPDATED", "MultipleChoiceOption", o.id, {
        fields: Object.keys(input),
      });
      return optionView(updated);
    });
  },
  async setCorrect(id: string, qid: string, oid: string, actor: Actor) {
    return withDraft(id, actor, async (tx, e) => {
      if (e.type !== "MULTIPLE_CHOICE")
        invalid("پاسخ صحیح فقط برای آزمون چهارگزینه‌ای قابل تعیین است.");
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      const o = await existingOption(tx, q.id, uuid.parse(oid));
      await tx.multipleChoiceOption.updateMany({
        where: { questionId: q.id, isCorrect: true },
        data: { isCorrect: false },
      });
      const updated = await tx.multipleChoiceOption.update({
        where: { id: o.id },
        data: { isCorrect: true },
      });
      await audit(tx, actor, "CORRECT_OPTION_SET", "ExamQuestion", q.id, {
        optionId: o.id,
      });
      return optionView(updated);
    });
  },
  async removeOption(id: string, qid: string, oid: string, actor: Actor) {
    return withDraft(id, actor, async (tx, e) => {
      const q = await existingQuestion(tx, e, uuid.parse(qid));
      const o = await existingOption(tx, q.id, uuid.parse(oid));
      if (await tx.studentAnswer.count({ where: { optionId: o.id } }))
        conflict("این گزینه دارای پاسخ دانشجو است و قابل حذف نیست.");
      await tx.multipleChoiceOption.delete({ where: { id: o.id } });
      await audit(tx, actor, "OPTION_DELETED", "MultipleChoiceOption", o.id, {
        questionId: q.id,
      });
    });
  },
};
