"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { dateFa, message, num, statusFa } from "@/lib/format";
import { Heading, State } from "@/components/shell";
export default function ExamDetail() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const { data, loading, error, reload } = useLoad(async () => {
    const [exam, attempts] = await Promise.all([api.exam(id), api.attempts()]);
    return { exam, attempt: attempts.find((a) => a.examId === id) };
  }, [id]);
  async function start() {
    setBusy(true);
    setActionError("");
    try {
      const a = await api.start(id);
      router.push(`/student/exams/${id}/attempt?attempt=${a.id}`);
    } catch (e) {
      setActionError(message(e));
      reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="آزمون‌ها / جزئیات"
        title={data?.exam.titleFa || "جزئیات آزمون"}
        action={
          <Link href="/student/exams" className="btn btn-ghost">
            بازگشت
          </Link>
        }
      />
      <State loading={loading} error={error} retry={reload} empty={!data}>
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="card space-y-5 p-6">
            <div className="flex gap-2">
              <span className="badge">
                {data?.exam.type === "MULTIPLE_CHOICE"
                  ? "چهارگزینه‌ای"
                  : "تشریحی"}
              </span>
              {data?.attempt && (
                <span className="badge badge-muted">
                  {statusFa(data.attempt.status)}
                </span>
              )}
            </div>
            <h2 className="section-title">راهنمای آزمون</h2>
            <p className="whitespace-pre-wrap leading-8">
              {data?.exam.instructionsFa || "دستورالعملی ثبت نشده است."}
            </p>
            {data?.exam.type === "DESCRIPTIVE" && (
              <p className="rounded-xl bg-[var(--surface-info)] p-4 text-sm text-[var(--info-ink)]">
                فایل سؤال فقط پس از شروع آزمون و در صفحه پاسخ‌گویی نمایش داده
                می‌شود. با شروع آزمون، زمان پاسخ‌گویی شما محاسبه می‌شود.
              </p>
            )}
          </section>
          <aside className="card h-fit space-y-4 p-6">
            <h2 className="section-title">اطلاعات آزمون</h2>
            <p>
              شروع: <strong>{data && dateFa(data.exam.startsAt)}</strong>
            </p>
            <p>
              پایان: <strong>{data && dateFa(data.exam.endsAt)}</strong>
            </p>
            {data?.exam.durationMinutes && (
              <p>
                مدت: <strong>{num(data.exam.durationMinutes)} دقیقه</strong>
              </p>
            )}
            <p>
              نمره کل: <strong>{data && num(data.exam.maxPoints)}</strong>
            </p>
            {data?.attempt?.status === "IN_PROGRESS" ? (
              <Link
                className="btn btn-primary w-full"
                href={`/student/exams/${id}/attempt?attempt=${data.attempt.id}`}
              >
                ادامه آزمون
              </Link>
            ) : data?.attempt ? (
              <Link
                className="btn btn-outline w-full"
                href="/student/submissions"
              >
                مشاهده وضعیت پاسخ
              </Link>
            ) : (
              <button
                disabled={busy}
                className="btn btn-primary w-full"
                onClick={start}
              >
                {busy ? "در حال شروع…" : "شروع آزمون"}
              </button>
            )}
            <p className="text-xs leading-6 muted">
              سرور زمان مجاز و دسترسی شما را هنگام شروع بررسی می‌کند.
            </p>
            {actionError && (
              <p role="alert" className="text-sm text-[var(--danger-ink)]">
                {actionError}
              </p>
            )}
          </aside>
        </div>
      </State>
    </>
  );
}
