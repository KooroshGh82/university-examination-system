import './globals.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'سامانه آزمون دانشگاه',description:'پنل دانشجویی آزمون‌های دانشگاه'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}
