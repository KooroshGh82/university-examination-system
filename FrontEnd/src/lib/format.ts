export const dateFa=(value:string)=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{timeZone:'Asia/Tehran',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export const num=(n:number|string)=>new Intl.NumberFormat('fa-IR').format(Number(n));
export const statusFa=(s:string)=>({IN_PROGRESS:'در حال انجام',SUBMITTED:'ثبت شده',AUTO_SUBMITTED:'ثبت خودکار',ABSENT:'غایب',PUBLISHED:'منتشر شده',UNDER_REVIEW:'در حال بررسی',CONFIRMED:'نمره تأیید شد',CHANGED:'نمره اصلاح شد'} as Record<string,string>)[s]||s;
export const message=(e:unknown)=>e instanceof Error?e.message:'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
