"use client";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";
import { Heading, State } from "@/components/shell";
import { UserAvatar } from "@/components/app-brand";
export default function Profile() {
  const { data, loading, error, reload } = useLoad(api.me);
  return (
    <main className="mx-auto max-w-3xl space-y-7 p-5 lg:p-8">
      <Heading
        eyebrow="پنل مدیر / پروفایل"
        title="پروفایل مدیر"
        description="اطلاعات حساب دانشگاهی شما"
      />
      <State loading={loading} error={error} retry={reload} empty={!data}>
        <section className="card p-7">
          <div className="mb-7">
            <UserAvatar large />
          </div>
          {[
            ["نام و نام خانوادگی", data?.fullName],
            ["کد دانشجویی", data?.universityId],
            ["ایمیل", data?.email || "ثبت نشده"],
            ["نقش", "مدیر"],
          ].map(([label, value]) => (
            <div className="row mobile-stack" key={label}>
              <span className="muted">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      </State>
    </main>
  );
}
