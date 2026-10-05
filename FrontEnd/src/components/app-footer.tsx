"use client";
import { usePathname } from "next/navigation";
export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  return (
    <footer
      dir="rtl"
      className="border-t border-[var(--line)] bg-[var(--surface)] px-5 py-5 text-center text-sm text-[var(--muted)]"
    >
      ساخته شده با{" "}
      <span role="img" aria-label="قلب">
        ❤️
      </span>{" "}
      توسط کوروش قویدل تقوی
    </footer>
  );
}
