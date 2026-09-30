import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function authenticatedClient(){
 const jar=await cookies();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Supabase is not configured');
 const client=createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:(items)=>items.forEach(({name,value,options})=>jar.set(name,value,options))}});
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)throw new Error('Sign in required');
 return client;
}
export function sameOrigin(req:Request){
 // Next.js can use its internal localhost origin in req.url behind a proxy.
 const url=new URL(req.url),host=req.headers.get('host')??url.host;
 const protocol=req.headers.get('x-forwarded-proto')?.split(',')[0]??url.protocol.slice(0,-1);
 if(!['http','https'].includes(protocol)||req.headers.get('origin')!==`${protocol}://${host}`)throw new Error('Origin not allowed');
}
export function apiError(error:unknown){const message=error instanceof Error?error.message:'Request failed';return Response.json({error:message},{status:message.includes('Sign in')?401:400});}
