"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`field pl-12 ${props.className || ""}`}
      />
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"}
        aria-pressed={visible}
        className="absolute inset-y-0 left-0 px-3 text-[#688195]"
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
