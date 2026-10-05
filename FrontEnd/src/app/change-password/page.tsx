"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { ChangePassword } from "@/components/change-password";
import { AppLogo, UserAvatar } from "@/components/app-brand";
import { ThemeControl } from "@/components/theme-control";
const home = (user: User) =>
  user.role === "STUDENT"
    ? "/student/dashboard"
    : user.role === "PROFESSOR"
      ? "/professor/dashboard"
      : "/admin";
export default function RequiredPasswordChange() {
  const router = useRouter(),
    [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api
      .me()
      .then((u) => {
        if (!u.mustChangePassword) router.replace(home(u));
        else setUser(u);
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  async function logout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  }
  if (!user)
    return (
      <p role="status" className="p-8">
        در حال بررسی ورود…
      </p>
    );
  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-5 py-10">
      <div className="flex items-center justify-between">
        <AppLogo />
        <ThemeControl />
      </div>
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <UserAvatar />
          <strong>{user.fullName}</strong>
        </div>
        <h1 className="text-2xl font-black">تغییر گذرواژه اولیه</h1>
        <p className="muted leading-8">
          برای ورود به پنل، ابتدا گذرواژه اولیه خود را تغییر دهید. گذرواژه جدید
          باید حداقل ۶ کاراکتر داشته باشد و با گذرواژه اولیه متفاوت باشد.
        </p>
      </section>
      <ChangePassword onSuccess={() => router.replace(home(user))} />
      <button onClick={logout} className="btn btn-outline">
        خروج از حساب
      </button>
    </main>
  );
}
