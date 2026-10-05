"use client";
import Link from "next/link";
import { Heading, State } from "@/components/shell";
import { useLoad } from "@/lib/use-load";
import { professorOverview } from "@/lib/professor-load";
import {
  ProfessorExamRow,
  SubmissionRow,
  ObjectionRow,
} from "@/components/professor-rows";
import { num } from "@/lib/format";
export default function Dashboard() {
  const { data, loading, error, reload } = useLoad(professorOverview);
  const active =
      data?.exams.filter(
        (e) =>
          e.status === "PUBLISHED" &&
          Date.parse(e.startsAt) <= Date.now() &&
          Date.parse(e.endsAt) > Date.now(),
      ) || [],
    pending =
      data?.attempts.filter(
        (a) =>
          a.status !== "IN_PROGRESS" &&
          a.status !== "ABSENT" &&
          !data.grades.some(
            (g) => g.attemptId === a.id && g.status === "PUBLISHED",
          ),
      ) || [],
    objections =
      data?.objections.filter(
        (o) => o.status === "SUBMITTED" || o.status === "UNDER_REVIEW",
      ) || [];
  return (
    <>
      <Heading
        eyebrow="پنل استاد / داشبورد"
        title="داشبورد استاد"
        description="آزمون‌ها، پاسخ‌ها و درخواست‌های نیازمند بررسی"
        action={
          <Link href="/professor/exams/create" className="btn btn-primary">
            ایجاد آزمون
          </Link>
        }
      />
      <State loading={loading} error={error} retry={reload} empty={!data}>
        <section className="card flex flex-wrap items-center justify-between gap-5 bg-[#102c47] p-7 text-white">
          <div>
            <p className="text-[#6de0ca]">مدیریت آموزشی</p>
            <h2 className="mt-2 text-2xl font-black">
              {num(data?.links.filter((x) => x.isActive).length || 0)} درس به
              شما تخصیص داده شده است
            </h2>
            <p className="mt-3 text-[#c4d7e3]">
              آزمون‌ها و پاسخ‌های درس‌های خود را مدیریت کنید.
            </p>
          </div>
          <Link
            href="/professor/courses"
            className="btn bg-[#2dd2b0] text-[#102c47]"
          >
            درس‌های من
          </Link>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["آزمون‌های فعال", active.length],
            ["پاسخ‌های در انتظار انتشار", pending.length],
            ["اعتراض‌های باز", objections.length],
          ].map(([label, value]) => (
            <div className="card p-6" key={label}>
              <p className="muted">{label}</p>
              <strong className="mt-3 block text-3xl text-[var(--accent)]">
                {num(value)}
              </strong>
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card p-6">
            <div className="flex justify-between">
              <h2 className="section-title">آزمون‌های فعال</h2>
              <Link className="link text-sm" href="/professor/exams">
                همه آزمون‌ها
              </Link>
            </div>
            {active.length ? (
              active
                .slice(0, 4)
                .map((e) => (
                  <ProfessorExamRow
                    key={e.id}
                    exam={e}
                    course={
                      data?.links.find((x) => x.course.id === e.courseId)
                        ?.course
                    }
                  />
                ))
            ) : (
              <p className="mt-5 muted">آزمون فعالی وجود ندارد.</p>
            )}
          </section>
          <section className="card p-6">
            <div className="flex justify-between">
              <h2 className="section-title">پاسخ‌های دانشجویان</h2>
              <Link className="link text-sm" href="/professor/submissions">
                همه پاسخ‌ها
              </Link>
            </div>
            {pending.length ? (
              pending
                .slice(0, 4)
                .map((a) => (
                  <SubmissionRow
                    key={a.id}
                    attempt={a}
                    exam={data?.exams.find((e) => e.id === a.examId)}
                    grade={data?.grades.find((g) => g.attemptId === a.id)}
                  />
                ))
            ) : (
              <p className="mt-5 muted">پاسخی در انتظار بررسی وجود ندارد.</p>
            )}
          </section>
        </div>
        <section className="card p-6">
          <div className="flex justify-between">
            <h2 className="section-title">اعتراض‌های باز</h2>
            <Link href="/professor/objections" className="link text-sm">
              همه اعتراض‌ها
            </Link>
          </div>
          {objections.length ? (
            objections
              .slice(0, 4)
              .map((o) => <ObjectionRow key={o.id} objection={o} />)
          ) : (
            <p className="mt-5 muted">اعتراض بازی وجود ندارد.</p>
          )}
        </section>
      </State>
    </>
  );
}
