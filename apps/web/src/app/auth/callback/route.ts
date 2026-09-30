import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requestOrigin } from '@/lib/request-origin';
import { signInFailure } from '@/lib/auth-recovery';
export async function GET(req:Request){
 const url=new URL(req.url),code=url.searchParams.get('code'),tokenHash=url.searchParams.get('token_hash');const store=await cookies();
 const redirect=(reason?:string)=>Response.redirect(new URL(reason?`/?signin=${reason}`:'/',requestOrigin(req)));
 if(url.searchParams.has('error'))return redirect(signInFailure({code:url.searchParams.get('error_code')??undefined}));
 if(!code&&!tokenHash)return redirect('failed');
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:values=>values.forEach(v=>store.set(v.name,v.value,v.options))}});
 try{
  const result=code?await client.auth.exchangeCodeForSession(code):await client.auth.verifyOtp({token_hash:tokenHash!,type:'email'});
  return redirect(result.error?signInFailure(result.error):undefined);
 }catch{return redirect('failed');}
}
