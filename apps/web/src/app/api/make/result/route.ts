import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
export async function POST(req:Request){try{
 const secret=process.env.MAKE_CALLBACK_SECRET,token=process.env.MAKE_EXECUTOR_TOKEN,provided=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!secret||!token||provided.length!==secret.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(secret)))throw new Error('Invalid callback');
 const body=z.object({id:z.string().uuid(),hash:z.string().regex(/^[a-f0-9]{64}$/),provider_id:z.string().min(1).max(250)}).parse(await req.json());
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await client.rpc('office_executor',{p_token:token,p_operation:'complete',p_data:body});if(error)throw new Error(error.message);
 return Response.json({recorded:true});
}catch{return Response.json({error:'Provider result rejected'},{status:403});}}
