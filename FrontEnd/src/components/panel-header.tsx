'use client';
import {ThemeControl} from './theme-control';
import Link from 'next/link';
import {LogOut,Menu} from 'lucide-react';
import type {User} from '@/lib/types';
import {dateFa} from '@/lib/format';
import {AppLogo,UserAvatar} from './app-brand';
const roles={STUDENT:{label:'دانشجو',home:'/student/dashboard',profile:'/student/profile'},PROFESSOR:{label:'استاد',home:'/professor/dashboard',profile:'/professor/profile'},ADMIN:{label:'مدیر',home:'/admin',profile:'/admin/profile'}};
export function PanelHeader({user,onLogout,onMenu,menuOpen}:{user:User;onLogout:()=>void;onMenu?:()=>void;menuOpen?:boolean}){
 const role=roles[user.role];
 return <header className="sticky top-0 z-30 flex min-h-[75px] items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 lg:px-8">
  {onMenu&&<button aria-label="باز کردن منو" aria-expanded={menuOpen} className="rounded-lg p-1 lg:hidden" onClick={onMenu}><Menu size={22}/></button>}
  <Link href={role.home} aria-label="صفحه اصلی سامانه آزمون دانشگاه" title="صفحه اصلی" className="flex shrink-0 items-center gap-3 rounded-xl"><AppLogo/><span className="hidden xl:block"><strong className="block text-sm">سامانه آزمون دانشگاه</strong><small className="text-[var(--muted)]">پنل {role.label}</small></span></Link>
  <span className="hidden text-xs text-[var(--muted)] 2xl:block">{dateFa(new Date().toISOString())}</span>
  <div className="mr-auto flex min-w-0 items-center gap-2">
   <Link href={role.profile} aria-label={`پروفایل ${user.fullName}`} title="مشاهده پروفایل" className="flex min-w-0 items-center gap-3 rounded-xl p-1.5 transition hover:bg-[var(--surface-tint)]"><div className="hidden min-w-0 text-left sm:block"><strong className="block max-w-[150px] truncate text-sm sm:max-w-[250px]">{user.fullName}</strong><small className="text-[var(--muted)]">{role.label}</small></div><UserAvatar/></Link>
   <ThemeControl/><button onClick={onLogout} aria-label="خروج" title="خروج" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><LogOut size={19}/></button>
  </div>
 </header>;
}
