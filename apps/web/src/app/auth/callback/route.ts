import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requestOrigin } from '@/lib/request-origin';
export async function GET(req:Request){
 const url=new URL(req.url),code=url.searchParams.get('code'),tokenHash=url.searchParams.get('token_hash');const store=await cookies();
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:values=>values.forEach(v=>store.set(v.name,v.value,v.options))}});
 const result=code?await client.auth.exchangeCodeForSession(code):tokenHash?await client.auth.verifyOtp({token_hash:tokenHash,type:'email'}):{error:new Error('Missing sign-in code')};
 return Response.redirect(new URL(result.error?'/?signin=failed':'/',requestOrigin(req)));
}
