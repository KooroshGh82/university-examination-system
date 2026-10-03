 'use client';
import {useState} from 'react';
import {professorApi} from '@/lib/api';
import {message} from '@/lib/format';
import type {Course} from '@/lib/types';
export function CreateCourse({onCreated}:{onCreated:(course:Course)=>void}){
 const [title,setTitle]=useState(''),[code,setCode]=useState(''),[term,setTerm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const course=await professorApi.createCourse({titleFa:title.trim(),code:code.trim(),termCode:term.trim()});setTitle('');setCode('');setTerm('');onCreated(course)}catch(e){setError(message(e))}finally{setBusy(false)}}
 return <form onSubmit={submit} className="card max-w-4xl space-y-4 p-6"><h2 className="text-xl font-bold">ایجاد درس</h2><p className="text-sm muted">درس جدید به شما تخصیص داده می‌شود و می‌توانید برای آن آزمون بسازید.</p><div className="grid gap-4 md:grid-cols-3"><label>نام درس<input className="field mt-2" required maxLength={200} disabled={busy} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>کد درس<input className="field mt-2" required maxLength={32} disabled={busy} value={code} onChange={e=>setCode(e.target.value)}/></label><label>نیمسال<input className="field mt-2" placeholder="1405-1" required maxLength={32} disabled={busy} value={term} onChange={e=>setTerm(e.target.value)}/></label></div>{error&&<p role="alert" className="text-[var(--danger-ink)]">{error}</p>}<button disabled={busy} className="btn btn-primary">{busy?'در حال ایجاد…':'ایجاد درس'}</button></form>;
}
