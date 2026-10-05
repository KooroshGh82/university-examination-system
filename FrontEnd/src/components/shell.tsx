"use client";
import { AppLogo } from "./app-brand";
import { PanelHeader } from "./panel-header";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileCheck2,
  ChartColumn,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
const nav = [
  ["/student/dashboard", "داشبورد", LayoutDashboard],
  ["/student/courses", "درس‌های من", BookOpen],
  ["/student/exams", "آزمون‌ها", ClipboardList],
  ["/student/submissions", "پاسخ‌نامه‌ها", FileCheck2],
  ["/student/grades", "نمرات و عملکرد", ChartColumn],
  ["/student/objections", "اعتراض‌های من", MessageSquare],
  ["/student/profile", "پروفایل", UserRound],
] as const;
export function StudentShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [open, setOpen] = useState(false);
  const router = useRouter(),
    path = usePathname();
  useEffect(() => {
    api
      .me()
      .then((u) => {
        if (u.mustChangePassword) router.replace("/change-password");
        else if (u.role !== "STUDENT") router.replace("/login");
        else setUser(u);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);
  async function logout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  }
  if (loading)
    return (
      <div className="p-8" role="status">
        در حال بررسی ورود…
      </div>
    );
  if (!user) return null;
  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`${open ? "block" : "hidden"} fixed inset-0 z-40 bg-black/40 lg:hidden`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`${open ? "translate-x-0" : "translate-x-full"} fixed inset-y-0 right-0 z-50 w-[260px] bg-[#102c47] text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <Link
            href="/student/dashboard"
            onClick={() => setOpen(false)}
            aria-label="صفحه اصلی سامانه آزمون دانشگاه"
            className="flex items-center gap-3 rounded-xl"
          >
            <AppLogo />
            <div>
              <strong className="block">سامانه آزمون دانشگاه</strong>
              <small className="text-[#b9d0df]">پنل دانشجو</small>
            </div>
          </Link>
          <button
            className="mr-auto lg:hidden"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="space-y-1 p-4" aria-label="ناوبری دانشجو">
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${path === href || path.startsWith(href + "/") ? "border-r-[3px] border-[#2dd2b0] bg-white/10 text-white" : "text-[#c5d6e1] hover:bg-white/5"}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <p className="absolute bottom-5 right-6 text-xs text-[#93afc1]">
          دانشگاه • سامانه یکپارچه آزمون
        </p>
      </aside>
      <div className="min-w-0 flex-1">
        <PanelHeader
          user={user}
          onLogout={logout}
          onMenu={() => setOpen(true)}
          menuOpen={open}
        />
        <main className="mx-auto max-w-[1420px] space-y-7 p-5 pb-16 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold text-[var(--accent)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-black lg:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function State({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  retry?: () => void;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="space-y-3" role="status" aria-label="در حال بارگذاری">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    );
  if (error)
    return (
      <div className="card p-7 text-center" role="alert">
        <p>{error}</p>
        {retry && (
          <button className="btn btn-outline mt-4" onClick={retry}>
            تلاش دوباره
          </button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="card p-8 text-center muted">
        موردی برای نمایش وجود ندارد.
      </div>
    );
  return <>{children}</>;
}
