import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Orbit — Your AI company',description:'A private office for your AI team. Give direction, follow the work, approve the next move.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
