'use client';
import {createContext,useContext,useEffect,useState} from 'react';
export type ThemePreference='light'|'dark'|'system';
const key='university-exams-theme';
const valid=(value:string|null):ThemePreference=>value==='light'||value==='dark'?value:'system';
const ThemeContext=createContext<{preference:ThemePreference;dark:boolean;setPreference:(theme:ThemePreference)=>void}>({preference:'system',dark:false,setPreference:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){
 const [preference,setPreferenceState]=useState<ThemePreference>('system'),[dark,setDark]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{try{setPreferenceState(valid(localStorage.getItem(key)))}catch{}setReady(true);const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null)setPreferenceState(valid(event.newValue))};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 useEffect(()=>{if(!ready)return;const media=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const next=preference==='dark'||(preference==='system'&&media.matches);setDark(next);document.documentElement.classList.toggle('dark',next);document.documentElement.dataset.theme=next?'dark':'light';document.documentElement.style.colorScheme=next?'dark':'light'};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply)},[preference,ready]);
 function setPreference(theme:ThemePreference){setPreferenceState(theme);try{localStorage.setItem(key,theme)}catch{}}
 return <ThemeContext.Provider value={{preference,dark,setPreference}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
