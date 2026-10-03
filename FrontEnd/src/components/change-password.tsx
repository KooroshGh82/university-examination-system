 'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import {message} from '@/lib/format';
import {PasswordInput} from './password-input';
export function ChangePassword(){
  const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setSuccess(false);if(password!==confirm){setError('تکرار گذرواژه با گذرواژه جدید یکسان نیست.');return}if(password===current){setError('گذرواژه جدید باید با گذرواژه فعلی متفاوت باشد.');return}setBusy(true);try{await api.changePassword(current,password);setCurrent('');setPassword('');setConfirm('');setSuccess(true)}catch(e){setError(message(e))}finally{setBusy(false)}}
  return <section className="card max-w-2xl p-7"><h2 className="mb-5 text-xl font-bold">تغییر گذرواژه</h2><form onSubmit={submit} className="space-y-5"><label className="block space-y-2"><span>گذرواژه فعلی</span><PasswordInput required autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} disabled={busy}/></label><label className="block space-y-2"><span>گذرواژه جدید (حداقل ۶ کاراکتر)</span><PasswordInput required minLength={6} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><label className="block space-y-2"><span>تکرار گذرواژه جدید</span><PasswordInput required minLength={6} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/></label>{error&&<p role="alert" className="text-[var(--danger-ink)]">{error}</p>}{success&&<p role="status" className="text-[var(--accent)]">گذرواژه تغییر کرد. نشست‌های دیگر شما بسته شدند.</p>}<button className="btn btn-primary" disabled={busy}>{busy?'در حال ذخیره…':'ذخیره گذرواژه'}</button></form></section>;
}
