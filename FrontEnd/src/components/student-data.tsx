"use client";
import Link from "next/link";
import { dateFa, num, statusFa } from "@/lib/format";
import type { Exam, Attempt, Grade, Course } from "@/lib/types";
export function ExamRow({
  exam,
  attempt,
  course,
}: {
  exam: Exam;
  attempt?: Attempt;
  course?: Course;
}) {
  return (
    <div className="row mobile-stack">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong>{exam.titleFa}</strong>
          <span className="badge">
            {exam.type === "MULTIPLE_CHOICE" ? "چهارگزینه‌ای" : "تشریحی"}
          </span>
          {attempt && (
            <span className="badge badge-muted">
              {statusFa(attempt.status)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm muted">
          {course?.titleFa || "درس"} • {dateFa(exam.startsAt)}
        </p>
      </div>
      <Link
        className="btn btn-outline shrink-0"
        href={`/student/exams/${exam.id}`}
      >
        مشاهده آزمون
      </Link>
    </div>
  );
}
export function GradeChart({
  grades,
  attempts,
  exams,
  courses,
}: {
  grades: Grade[];
  attempts: Attempt[];
  exams: Exam[];
  courses: Course[];
}) {
  const data = grades
    .map((g) => {
      const a = attempts.find((a) => a.id === g.attemptId),
        e = exams.find((e) => e.id === a?.examId);
      return {
        g,
        e,
        course: courses.find((c) => c.id === e?.courseId),
        rate: e
          ? Math.min(
              100,
              Math.max(0, (Number(g.score) / Number(e.maxPoints)) * 100),
            )
          : 0,
      };
    })
    .filter((x) => x.e)
    .sort(
      (a, b) =>
        new Date(a.g.publishedAt).getTime() -
        new Date(b.g.publishedAt).getTime(),
    );
  const groups = Object.values(
    Object.groupBy(data, (x) => x.course?.id || "unknown"),
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="section-title">روند عملکرد</h2>
        <p className="mt-1 text-sm muted">
          درصد نمره آزمون‌های منتشرشده به ترتیب انتشار
        </p>
        {data.length ? (
          <div
            className="mt-9 flex h-48 items-end gap-3 border-b border-[var(--line)] pb-0"
            role="img"
            aria-label={data
              .map((x) => `${x.e?.titleFa}: ${num(Math.round(x.rate))} درصد`)
              .join("، ")}
          >
            {data.map((x) => (
              <div
                key={x.g.id}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                <div
                  style={{ height: `${Math.max(x.rate, 2)}%` }}
                  className="w-full max-w-14 rounded-t-md bg-[#81d9c9] group-last:bg-[#087f74]"
                  title={`${x.e?.titleFa}: ${num(Math.round(x.rate))}٪`}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 muted">هنوز نمره‌ای منتشر نشده است.</p>
        )}
      </section>
      <section className="card p-6">
        <h2 className="section-title">مقایسه نمرات بر اساس درس</h2>
        <p className="mt-1 text-sm muted">
          درصد هر آزمون از نمره کل همان آزمون
        </p>
        <div className="mt-5 space-y-5">
          {groups.length ? (
            groups.map((group, i) => (
              <div key={i}>
                <strong className="text-sm">
                  {group?.[0]?.course?.titleFa || "درس"}
                </strong>
                <div className="mt-2 space-y-2">
                  {group?.map((x) => (
                    <div
                      key={x.g.id}
                      className="grid grid-cols-[minmax(90px,1fr)_2fr_auto] items-center gap-2 text-xs"
                    >
                      <span className="truncate" title={x.e?.titleFa}>
                        {x.e?.titleFa}
                      </span>
                      <div className="h-2 rounded-full bg-[var(--surface-soft)]">
                        <div
                          className="h-2 rounded-full bg-[#24b99b]"
                          style={{ width: `${x.rate}%` }}
                        />
                      </div>
                      <span>
                        {num(x.g.score)} / {num(x.e!.maxPoints)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="muted">داده‌ای برای مقایسه وجود ندارد.</p>
          )}
        </div>
      </section>
    </div>
  );
}
