"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { dateFa, statusFa } from "@/lib/format";
import { Heading, State } from "@/components/shell";
export default function Submissions() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [attempts, exams] = await Promise.all([api.attempts(), api.exams()]);
    return { attempts, exams };
  });
  return (
    <>
      <Heading
        eyebrow="پنل دانشجو / پاسخ‌نامه‌ها"
        title="وضعیت پاسخ‌نامه‌ها"
        description="وضعیت ثبت، غیبت و ثبت خودکار آزمون‌های شما"
      />
      <State
        loading={loading}
        error={error}
        retry={reload}
        empty={!data?.attempts.length}
      >
        <section className="card p-6">
          {data?.attempts.map((a) => (
            <div className="row mobile-stack" key={a.id}>
              <div>
                <strong>
                  {data.exams.find((e) => e.id === a.examId)?.titleFa ||
                    "آزمون"}
                </strong>
                <p className="mt-2 text-sm muted">
                  {a.submittedAt
                    ? dateFa(a.submittedAt)
                    : `شروع: ${dateFa(a.startedAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-muted">{statusFa(a.status)}</span>
                <Link
                  href={`/student/exams/${a.examId}/attempt?attempt=${a.id}`}
                  className="link"
                >
                  جزئیات
                </Link>
              </div>
            </div>
          ))}
        </section>
      </State>
    </>
  );
}
