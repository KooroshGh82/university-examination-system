"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { professorApi } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { Heading, State } from "@/components/shell";
import { ProfessorExamRow } from "@/components/professor-rows";
export default function Course() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useLoad(async () => {
    const [links, exams] = await Promise.all([
      professorApi.courses(),
      professorApi.exams(),
    ]);
    const link = links.find((x) => x.course.id === id);
    if (!link) throw new Error("این درس به حساب شما تخصیص داده نشده است.");
    return { link, exams: exams.filter((e) => e.courseId === id) };
  }, [id]);
  return (
    <>
      <Heading
        eyebrow="درس‌های من / جزئیات"
        title={data?.link.course.titleFa || "درس"}
        description={
          data
            ? `${data.link.course.code} • ${data.link.course.termCode}`
            : undefined
        }
        action={
          data?.link.isActive && (
            <Link
              href={`/professor/exams/create?course=${id}`}
              className="btn btn-primary"
            >
              ایجاد آزمون
            </Link>
          )
        }
      />
      <State loading={loading} error={error} retry={reload} empty={!data}>
        <section className="card p-6">
          <h2 className="section-title">آزمون‌های درس</h2>
          {data?.exams.length ? (
            data.exams.map((e) => (
              <ProfessorExamRow key={e.id} exam={e} course={data.link.course} />
            ))
          ) : (
            <p className="mt-5 muted">هنوز آزمونی برای این درس وجود ندارد.</p>
          )}
        </section>
      </State>
    </>
  );
}
