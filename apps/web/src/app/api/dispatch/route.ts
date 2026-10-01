import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { authenticatedClient,sameOrigin,apiError } from '@/lib/server';
export async function POST(req:Request){try{
 sameOrigin(req);const client=await authenticatedClient();const input=z.object({id:z.string().uuid(),hash:z.string().regex(/^[a-f0-9]{64}$/)}).parse(await req.json());
 const url=process.env.MAKE_WEBHOOK_URL,secret=process.env.MAKE_SIGNING_SECRET;
 if(!url||!secret||!process.env.MAKE_EXECUTOR_TOKEN||!process.env.MAKE_CALLBACK_SECRET)throw new Error('Make is not connected. Your approved draft remains unsent.');
 const target=new URL(url);if(target.protocol!=='https:'||!/^hook\.(eu\d+|us\d+)\.make\.com$/.test(target.hostname))throw new Error('Make endpoint is not an approved webhook host');
 const {data,error}=await client.rpc('office_command',{p_command:'dispatch',p_data:input});if(error)throw new Error(error.message);
 const timestamp=Date.now();const payload=JSON.stringify({action_id:data.id,snapshot_hash:data.snapshot_hash,snapshot:data.snapshot,timestamp});
 // The trusted Make scenario verifies this HMAC before touching Gmail.
 try{const response=await fetch(target,{method:'POST',headers:{'content-type':'application/json','x-office-signature':createHmac('sha256',secret).update(payload).digest('hex')},body:payload,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Provider delivery could not be confirmed');
 }catch{await client.rpc('office_command',{p_command:'unknown',p_data:input});return Response.json({status:'outcome_unknown',message:'Delivery is uncertain. Inspect Make and Gmail before reconciling; do not resend.'},{status:202});}
 return Response.json({status:'dispatching',message:'Submitted to Make. Awaiting a verified provider result.'},{status:202});
 }catch(e){return apiError(e);}}
