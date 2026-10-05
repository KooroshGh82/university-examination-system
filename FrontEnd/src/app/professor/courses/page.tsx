"use client";
import { CreateCourse } from "@/components/create-course";
import Link from "next/link";
import { professorApi } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { Heading, State } from "@/components/shell";
export default function Courses() {
  const { data, loading, error, reload } = useLoad(professorApi.courses);
  return (
    <>
      <Heading
        eyebrow="پنل استاد / درس‌ها"
        title="درس‌های من"
        description="فقط درس‌هایی که به شما تخصیص داده شده‌اند نمایش داده می‌شوند."
      />
      <CreateCourse onCreated={() => reload()} />
      <State
        loading={loading}
        error={error}
        retry={reload}
        empty={!data?.length}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((x) => (
            <article className="card p-6" key={x.assignmentId}>
              <span className={`badge ${x.isActive ? "" : "badge-muted"}`}>
                {x.isActive ? "تخصیص فعال" : "تخصیص غیرفعال"}
              </span>
              <h2 className="mt-4 text-lg font-bold">{x.course.titleFa}</h2>
              <p className="mt-2 text-sm muted">
                {x.course.code} • {x.course.termCode}
              </p>
              <Link
                className="btn btn-outline mt-5"
                href={`/professor/courses/${x.course.id}`}
              >
                مشاهده آزمون‌ها
              </Link>
            </article>
          ))}
        </div>
      </State>
    </>
  );
}
