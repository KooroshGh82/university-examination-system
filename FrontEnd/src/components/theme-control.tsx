"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "./theme-provider";
export function ThemeControl() {
  const { preference, dark, setPreference } = useTheme();
  const Icon = preference === "system" ? Monitor : dark ? Moon : Sun;
  return (
    <label className="theme-control" title="تنظیم ظاهر در این دستگاه">
      <Icon size={18} aria-hidden="true" />
      <span className="sr-only">حالت نمایش</span>
      <select
        aria-label="حالت نمایش"
        value={preference}
        onChange={(e) => setPreference(e.target.value as ThemePreference)}
      >
        <option value="system">سیستم</option>
        <option value="light">روشن</option>
        <option value="dark">تیره</option>
      </select>
    </label>
  );
}
