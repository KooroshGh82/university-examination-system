"use client";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { Heading, State } from "@/components/shell";
export default function Courses() {
  const { data, loading, error, reload } = useLoad(api.courses);
  return (
    <>
      <Heading
        eyebrow="پنل دانشجو / درس‌ها"
        title="درس‌های من"
        description="درس‌هایی که دانشگاه برای شما ثبت کرده است."
      />
      <State
        loading={loading}
        error={error}
        retry={reload}
        empty={!data?.length}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((x) => (
            <article className="card p-6" key={x.enrollmentId}>
              <span className="badge">{x.isActive ? "فعال" : "سابقه"}</span>
              <h2 className="mt-4 text-lg font-bold">{x.course.titleFa}</h2>
              <p className="mt-2 text-sm muted">
                {x.course.code} • {x.course.termCode}
              </p>
            </article>
          ))}
        </div>
      </State>
    </>
  );
}
