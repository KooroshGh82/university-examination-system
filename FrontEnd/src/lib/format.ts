export const dateFa = (value: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const num = (n: number | string) =>
  new Intl.NumberFormat("fa-IR").format(Number(n));
export const statusFa = (s: string) =>
  (
    ({
      IN_PROGRESS: "در حال انجام",
      SUBMITTED: "ثبت شده",
      AUTO_SUBMITTED: "ثبت خودکار",
      ABSENT: "غایب",
      PUBLISHED: "منتشر شده",
      UNDER_REVIEW: "در حال بررسی",
      CONFIRMED: "نمره تأیید شد",
      CHANGED: "نمره اصلاح شد",
    }) as Record<string, string>
  )[s] || s;
export const message = (e: unknown) => {
  if (e instanceof Error) {
    if (/[\u0600-\u06ff]/.test(e.message)) return e.message;
    const code = (e as { code?: string }).code;
    if (code === "INVALID_CREDENTIALS")
      return "کد یا گذرواژه واردشده صحیح نیست.";
    if (e instanceof TypeError)
      return "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.";
  }
  return "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
};

export function studentLabel(student?: {
  fullName: string;
  universityId: string;
}) {
  return student
    ? `${student.fullName} • کد دانشجویی: ${student.universityId}`
    : "اطلاعات دانشجو در دسترس نیست";
}
