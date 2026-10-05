import * as jalaali from "jalaali-js";
import { DateTime } from "luxon";
const latin = (s: string) =>
  s
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
export function parseJalali(value: string) {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})$/.exec(
    latin(value.trim()),
  );
  if (!m) throw new Error("تاریخ را به شکل ۱۴۰۵/۰۷/۰۶ ۱۰:۳۰ وارد کنید.");
  const [jy, jm, jd, h, minute] = m.slice(1).map(Number);
  if (!jalaali.isValidJalaaliDate(jy, jm, jd) || h > 23 || minute > 59)
    throw new Error("تاریخ یا ساعت معتبر نیست.");
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  const d = DateTime.fromObject(
    { year: gy, month: gm, day: gd, hour: h, minute },
    { zone: "Asia/Tehran" },
  );
  if (!d.isValid) throw new Error("تاریخ یا ساعت معتبر نیست.");
  return d.toUTC().toISO()!;
}
export function toJalaliInput(iso: string) {
  const d = DateTime.fromISO(iso).setZone("Asia/Tehran");
  const j = jalaali.toJalaali(d.year, d.month, d.day);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")} ${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`;
}
