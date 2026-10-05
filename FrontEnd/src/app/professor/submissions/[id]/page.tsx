"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { professorApi, downloadFile } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { dateFa, message, num, statusFa, studentLabel } from "@/lib/format";
import { Heading, State } from "@/components/shell";
import { ApiError } from "@/lib/types";
export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>(),
    [score, setScore] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const { data, loading, error, reload } = useLoad(async () => {
    const attempt = await professorApi.attempt(id);
    const [exam, links, grade, files] = await Promise.all([
      professorApi.exam(attempt.examId),
      professorApi.courses(),
      professorApi.grade(id).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
      professorApi.files(id).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return { items: [] };
        throw e;
      }),
    ]);
    const link = links.find((x) => x.course.id === exam.courseId);
    if (!link) throw new Error("دسترسی به این درس ندارید.");
    setScore(grade?.score || "");
    return { attempt, exam, link, grade, files: files.items };
  }, [id]);
  const a = data?.attempt,
    e = data?.exam,
    g = data?.grade,
    canManage = !!data?.link.isActive;
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="پاسخ‌های دانشجویان / بررسی"
        title={e?.titleFa || "بررسی پاسخ"}
        description={a ? studentLabel(a.student) : undefined}
        action={
          <Link className="btn btn-ghost" href="/professor/submissions">
            بازگشت
          </Link>
        }
      />
      <State loading={loading} error={error} retry={reload} empty={!data}>
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="card space-y-5 p-6">
            <h2 className="section-title">پاسخ دانشجو</h2>
            <p>
              وضعیت: <span className="badge">{statusFa(a?.status || "")}</span>
            </p>
            <p className="muted">
              {a?.submittedAt
                ? `ثبت شده در ${dateFa(a.submittedAt)}`
                : "هنوز ثبت نهایی نشده است."}
            </p>
            {e?.type === "DESCRIPTIVE" ? (
              <div>
                <h3 className="font-bold">فایل‌های پاسخ</h3>
                {data?.files.length ? (
                  data.files.map((f) => (
                    <div className="row mobile-stack" key={f.id}>
                      <span>
                        {f.originalName} • {num(Math.round(f.sizeBytes / 1024))}{" "}
                        کیلوبایت
                      </span>
                      <button
                        className="btn btn-outline"
                        onClick={() =>
                          downloadFile(f.id, f.originalName).catch((e) =>
                            setActionError(message(e)),
                          )
                        }
                      >
                        دریافت امن
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 muted">فایل پاسخ ثبت نشده است.</p>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-bold">پاسخ‌های چهارگزینه‌ای</h3>
                {a?.questions
                  ?.slice()
                  .sort((x, y) => x.position - y.position)
                  .map((q) => (
                    <article key={q.attemptQuestionId} className="row block">
                      <strong>
                        {num(q.position)}. {q.promptFa}
                      </strong>
                      <p className="mt-2 text-sm muted">
                        پاسخ انتخابی:{" "}
                        {q.options.find((o) => o.id === q.selectedOptionId)
                          ?.textFa || "بدون پاسخ"}
                      </p>
                    </article>
                  )) || (
                  <p className="mt-3 muted">
                    جزئیات سؤال در پاسخ سرور موجود نیست.
                  </p>
                )}
              </div>
            )}
          </section>
          <aside className="card h-fit space-y-4 p-6">
            <h2 className="section-title">نمره و انتشار</h2>
            {g ? (
              <>
                <p>
                  نمره:{" "}
                  <strong>
                    {num(g.score)} / {num(e?.maxPoints || 0)}
                  </strong>
                </p>
                <span className="badge">{statusFa(g.status)}</span>
              </>
            ) : (
              <p className="muted">هنوز نمره‌ای ثبت نشده است.</p>
            )}
            {canManage &&
              e &&
              a &&
              ["SUBMITTED", "AUTO_SUBMITTED"].includes(a.status) && (
                <form
                  onSubmit={(x) => {
                    x.preventDefault();
                    act(() => professorApi.saveGrade(id, score));
                  }}
                  className="space-y-3"
                >
                  <label className="block">
                    نمره از {num(e.maxPoints)}
                    <input
                      className="field mt-2"
                      type="number"
                      min="0"
                      max={e.maxPoints}
                      step="0.01"
                      inputMode="decimal"
                      required
                      value={score}
                      onChange={(x) => setScore(x.target.value)}
                      placeholder={g?.score || "0.00"}
                    />
                  </label>
                  <button className="btn btn-outline w-full" disabled={busy}>
                    {g?.status === "PUBLISHED"
                      ? "ذخیره تغییر نمره"
                      : "ذخیره نمره"}
                  </button>
                </form>
              )}
            {canManage &&
              g?.status === "DRAFT" &&
              a?.status !== "IN_PROGRESS" &&
              a?.status !== "ABSENT" && (
                <button
                  className="btn btn-primary w-full"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("نمره این دانشجو منتشر شود؟"))
                      act(() => professorApi.publishGrade(g.id));
                  }}
                >
                  انتشار نمره این دانشجو
                </button>
              )}
            {g?.status === "PUBLISHED" && (
              <p className="text-sm leading-7 muted">
                تغییر نمره منتشرشده فوراً در پنل دانشجو نمایش داده می‌شود و در
                تاریخچه نمره ثبت می‌شود.
              </p>
            )}
            {actionError && (
              <p role="alert" className="text-[var(--danger-ink)]">
                {actionError}
              </p>
            )}
          </aside>
        </div>
      </State>
    </>
  );
}
