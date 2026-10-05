"use client";
import Link from "next/link";
import type {
  Exam,
  Course,
  ProfessorAttempt,
  ProfessorGrade,
  Objection,
} from "@/lib/types";
import { dateFa, num, statusFa, studentLabel } from "@/lib/format";
export function ProfessorExamRow({
  exam,
  course,
}: {
  exam: Exam;
  course?: Course;
}) {
  return (
    <div className="row mobile-stack">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong>{exam.titleFa}</strong>
          <span className="badge badge-muted">
            {exam.type === "MULTIPLE_CHOICE" ? "چهارگزینه‌ای" : "تشریحی"}
          </span>
          <span className="badge">{statusFa(exam.status)}</span>
        </div>
        <p className="mt-2 text-sm muted">
          {course?.titleFa || "درس"} • {dateFa(exam.startsAt)}
        </p>
      </div>
      <Link className="btn btn-outline" href={`/professor/exams/${exam.id}`}>
        مدیریت آزمون
      </Link>
    </div>
  );
}
export function SubmissionRow({
  attempt,
  exam,
  grade,
}: {
  attempt: ProfessorAttempt;
  exam?: Exam;
  grade?: ProfessorGrade;
}) {
  return (
    <div className="row mobile-stack">
      <div>
        <strong>{exam?.titleFa || "آزمون"}</strong>
        <p className="mt-2 text-sm muted">
          {studentLabel(attempt.student)} •{" "}
          {attempt.submittedAt ? dateFa(attempt.submittedAt) : "ثبت نهایی نشده"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="badge badge-muted">{statusFa(attempt.status)}</span>
        {grade?.status === "PUBLISHED" && (
          <span className="badge">{num(grade.score)}</span>
        )}
        <Link className="link" href={`/professor/submissions/${attempt.id}`}>
          بررسی
        </Link>
      </div>
    </div>
  );
}
export function ObjectionRow({
  objection,
  exam,
}: {
  objection: Objection;
  exam?: Exam;
}) {
  return (
    <div className="row mobile-stack">
      <div>
        <strong>{exam?.titleFa || "درخواست بررسی نمره"}</strong>
        <p className="mt-2 text-sm font-bold">
          {studentLabel(objection.student)}
        </p>
        <p className="mt-2 text-sm muted">
          {dateFa(objection.submittedAt)} • دور {num(objection.round)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="badge">{statusFa(objection.status)}</span>
        <Link href={`/professor/objections/${objection.id}`} className="link">
          بررسی
        </Link>
      </div>
    </div>
  );
}
