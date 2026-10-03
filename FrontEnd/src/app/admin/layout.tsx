'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';
import {PanelHeader} from '@/components/panel-header';
export default function AdminLayout({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),router=useRouter();
 useEffect(()=>{api.me().then(u=>{if(u.role==='ADMIN')setUser(u);else router.replace(u.role==='STUDENT'?'/student/dashboard':'/professor/dashboard')}).catch(()=>router.replace('/login'))},[router]);
 async function logout(){try{await api.logout()}finally{router.replace('/login')}}
 if(!user)return <p className="p-8" role="status">در حال بررسی ورود…</p>;
 return <div className="min-h-screen"><PanelHeader user={user} onLogout={logout}/>{children}</div>;
}
