"use client";
import { useId, useRef, useState } from "react";
import * as jalaali from "jalaali-js";
import { DateTime } from "luxon";
import {
  CalendarDays,
  Clock3,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
const months = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const fa = (n: number) =>
  new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(n);
const pad = (n: number) => String(n).padStart(2, "0");
const latin = (s: string) =>
  s
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
function today() {
  const d = DateTime.now().setZone("Asia/Tehran");
  return jalaali.toJalaali(d.year, d.month, d.day);
}
export function JalaliDateTimeInput({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState({ jy: 1405, jm: 1 }),
    [fallbackTime, setFallbackTime] = useState("09:00");
  const parts = value.split(" "),
    date = parts[0] || "",
    time = parts[1] || fallbackTime;
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(latin(date));
  const numbers = match?.slice(1).map(Number);
  const selected =
    numbers && jalaali.isValidJalaaliDate(numbers[0], numbers[1], numbers[2])
      ? { jy: numbers[0], jm: numbers[1], jd: numbers[2] }
      : null;
  const first = jalaali.toGregorian(view.jy, view.jm, 1),
    offset =
      (new Date(Date.UTC(first.gy, first.gm - 1, first.gd)).getUTCDay() + 1) %
      7,
    days = jalaali.jalaaliMonthLength(view.jy, view.jm);
  function open() {
    const current = selected || today();
    setView({ jy: current.jy, jm: current.jm });
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  function choose(day: number, year = view.jy, month = view.jm) {
    onChange(`${year}/${pad(month)}/${pad(day)} ${time}`);
    close();
  }
  function move(delta: number) {
    let jy = view.jy,
      jm = view.jm + delta;
    if (jm < 1) {
      jy--;
      jm = 12;
    }
    if (jm > 12) {
      jy++;
      jm = 1;
    }
    if (jy >= 1 && jy <= 3177) setView({ jy, jm });
  }
  const hours = Number(time.split(":")[0] || 9),
    minutes = Number(time.split(":")[1] || 0);
  function changeTime(hour: number, minute: number) {
    const next = `${pad(hour)}:${pad(minute)}`;
    setFallbackTime(next);
    onChange(`${date} ${next}`);
  }
  return (
    <div className="jalali-input">
      <label htmlFor={`${id}-date`} className="jalali-label">
        {label}
        {required && (
          <span className="jalali-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="jalali-controls">
        <div
          className={`jalali-date-control ${disabled ? "jalali-disabled" : ""}`}
        >
          <button
            ref={trigger}
            type="button"
            disabled={disabled}
            onClick={open}
            aria-label={`باز کردن تقویم ${label}`}
            aria-haspopup="dialog"
            className="jalali-icon-button"
            title="انتخاب از تقویم"
          >
            <CalendarDays size={21} strokeWidth={1.8} />
          </button>
          <input
            id={`${id}-date`}
            aria-describedby={`${id}-hint`}
            dir="ltr"
            placeholder="۱۴۰۵ / ۰۷ / ۱۱"
            value={date}
            disabled={disabled}
            required={required}
            maxLength={10}
            onChange={(e) => onChange(`${latin(e.target.value)} ${time}`)}
          />
        </div>
        <div
          className={`jalali-time-control ${disabled ? "jalali-disabled" : ""}`}
        >
          <Clock3
            size={20}
            strokeWidth={1.8}
            className="jalali-clock"
            aria-hidden="true"
          />
          <div className="jalali-time-fields" dir="ltr">
            <select
              aria-label={`ساعت ${label} به وقت تهران`}
              value={hours}
              disabled={disabled}
              onChange={(e) => changeTime(Number(e.target.value), minutes)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option value={h} key={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span aria-hidden="true">:</span>
            <select
              aria-label={`دقیقه ${label}`}
              value={minutes}
              disabled={disabled}
              onChange={(e) => changeTime(hours, Number(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option value={m} key={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <p id={`${id}-hint`} className="jalali-hint">
        <span>تقویم هجری شمسی</span>
        <span>ساعت تهران • ۲۴ ساعته</span>
      </p>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        dir="rtl"
        className="jalali-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              close();
          }
        }}
      >
        <div className="jalali-dialog-header">
          <div className="jalali-heading-icon">
            <CalendarDays size={23} />
          </div>
          <div>
            <h2 id={`${id}-title`}>{label}</h2>
            <p>انتخاب تاریخ هجری شمسی</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="بستن تقویم"
            className="jalali-close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="jalali-dialog-body">
          <div className="jalali-month-nav">
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => move(-1)}
              disabled={view.jy === 1 && view.jm === 1}
              className="jalali-nav-button"
            >
              <ChevronRight size={20} />
            </button>
            <select
              aria-label="ماه"
              value={view.jm}
              onChange={(e) =>
                setView((v) => ({ ...v, jm: Number(e.target.value) }))
              }
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="سال"
              value={view.jy}
              onChange={(e) =>
                setView((v) => ({ ...v, jy: Number(e.target.value) }))
              }
            >
              {Array.from({ length: 201 }, (_, i) => view.jy - 100 + i)
                .filter((y) => y >= 1 && y <= 3177)
                .map((y) => (
                  <option value={y} key={y}>
                    {fa(y)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              aria-label="ماه بعد"
              onClick={() => move(1)}
              disabled={view.jy === 3177 && view.jm === 12}
              className="jalali-nav-button"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {months[view.jm - 1]} {fa(view.jy)}
          </p>
          <div className="jalali-days">
            {[
              "شنبه",
              "یکشنبه",
              "دوشنبه",
              "سه‌شنبه",
              "چهارشنبه",
              "پنجشنبه",
              "جمعه",
            ].map((day, i) => (
              <span
                key={day}
                title={day}
                className={`jalali-weekday ${i === 6 ? "jalali-friday" : ""}`}
              >
                {["ش", "ی", "د", "س", "چ", "پ", "ج"][i]}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1,
                active =
                  selected?.jy === view.jy &&
                  selected.jm === view.jm &&
                  selected.jd === day;
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={`${fa(day)} ${months[view.jm - 1]} ${fa(view.jy)}`}
                  aria-pressed={active}
                  onClick={() => choose(day)}
                  className={`jalali-day ${active ? "jalali-day-selected" : ""} ${(offset + i) % 7 === 6 ? "jalali-friday" : ""}`}
                >
                  {fa(day)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="jalali-dialog-footer">
          <span>
            {selected
              ? `${fa(selected.jd)} ${months[selected.jm - 1]} ${fa(selected.jy)}`
              : "تاریخ مورد نظر را انتخاب کنید"}
          </span>
          <button
            type="button"
            onClick={() => {
              const t = today();
              choose(t.jd, t.jy, t.jm);
            }}
          >
            انتخاب امروز
          </button>
        </div>
      </dialog>
    </div>
  );
}
