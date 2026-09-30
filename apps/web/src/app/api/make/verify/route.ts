import { createHmac,timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
export async function POST(req:Request){try{
 const secret=process.env.MAKE_SIGNING_SECRET,token=process.env.MAKE_EXECUTOR_TOKEN;if(!secret||!token)throw new Error('Make executor is not configured');
 const text=await req.text();if(text.length>20000)throw new Error('Invalid payload');
 const signature=req.headers.get('x-office-signature')??'';if(!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(text).digest()))throw new Error('Signature rejected');
 const body=z.object({action_id:z.string().uuid(),snapshot_hash:z.string().regex(/^[a-f0-9]{64}$/),timestamp:z.number()}).parse(JSON.parse(text));
 if(Math.abs(Date.now()-body.timestamp)>300000)throw new Error('Expired request');
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.rpc('office_executor',{p_token:token,p_operation:'claim',p_data:{id:body.action_id,hash:body.snapshot_hash}});if(error)throw new Error(error.message);
 // Make must map Gmail fields from this DB-verified snapshot, never from the incoming webhook.
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}catch{return Response.json({error:'Execution denied. Inspect the action before retrying.'},{status:403});}}
