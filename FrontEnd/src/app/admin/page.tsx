 'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';
import {message} from '@/lib/format';
import {AdminExamStudents} from '@/components/admin-exam-students';
import {Heading} from '@/components/shell';
export default function Admin(){
 const router=useRouter();const [user,setUser]=useState<User|null>(null),[role,setRole]=useState<'STUDENT'|'PROFESSOR'>('STUDENT'),[name,setName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState<User|null>(null);
 useEffect(()=>{api.me().then(u=>{if(u.role==='ADMIN')setUser(u);else router.replace(u.role==='STUDENT'?'/student/dashboard':'/professor/dashboard')}).catch(()=>router.replace('/login'))},[router]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setCreated(null);try{setCreated(await api.createUser(role,name.trim(),code.trim()));setName('');setCode('')}catch(e){setError(message(e))}finally{setBusy(false)}}
 async function logout(){try{await api.logout()}finally{router.replace('/login')}}
 if(!user)return <div className="p-8" role="status">در حال بررسی ورود…</div>;
 return <div className="min-h-screen"><header className="flex items-center justify-between bg-[#102c47] p-5 text-white"><strong>سامانه آزمون دانشگاه • پنل مدیر</strong><div className="flex items-center gap-4"><span>{user.fullName}</span><button className="btn" onClick={logout}>خروج</button></div></header><main className="mx-auto max-w-3xl space-y-7 p-5 lg:p-8"><Heading title="ایجاد حساب دانشگاهی" description="تعریف دانشجو یا استاد با نام و شناسه دانشگاه"/><form className="card space-y-5 p-7" onSubmit={submit}><label className="block space-y-2"><span>نقش</span><select className="field" value={role} disabled={busy} onChange={e=>setRole(e.target.value as 'STUDENT'|'PROFESSOR')}><option value="STUDENT">دانشجو</option><option value="PROFESSOR">استاد</option></select></label><label className="block space-y-2"><span>نام و نام خانوادگی</span><input className="field" required maxLength={200} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label className="block space-y-2"><span>شناسه دانشگاه</span><input className="field" required maxLength={64} value={code} disabled={busy} onChange={e=>setCode(e.target.value)}/></label><p className="muted">گذرواژه اولیه همه حساب‌ها <b dir="ltr">123456</b> است. کاربران می‌توانند آن را از پروفایل خود تغییر دهند.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}{created&&<p role="status" className="text-[#087f74]">حساب {created.role==='STUDENT'?'دانشجو':'استاد'} برای {created.fullName} با شناسه {created.universityId} ایجاد شد.</p>}<button disabled={busy} className="btn btn-primary">{busy?'در حال ایجاد…':'ایجاد حساب'}</button></form><AdminExamStudents/></main></div>;
}
