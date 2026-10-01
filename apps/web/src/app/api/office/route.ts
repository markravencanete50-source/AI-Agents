import { z } from 'zod';
import { objectiveSchema,projectSchema } from '@office/contracts';
import { authenticatedClient,sameOrigin,apiError } from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(){try{const client=await authenticatedClient();const {data,error}=await client.rpc('office_snapshot');if(error)throw new Error(error.message);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const client=await authenticatedClient();
 const body=z.object({command:z.enum(['bootstrap','objective','project','pair','revoke_worker','pause','cancel','approve','reject','revoke','reconcile']),data:z.record(z.string(),z.unknown()).default({})}).parse(await req.json());
 let input:unknown=body.data;
 if(body.command==='objective')input=objectiveSchema.parse(body.data);
 if(body.command==='project')input=projectSchema.parse(body.data);
 if(['approve','reject','revoke','reconcile'].includes(body.command))input=z.object({id:z.string().uuid(),hash:z.string().regex(/^[a-f0-9]{64}$/),provider_id:z.string().min(1).max(250).optional()}).parse(body.data);
 if(['cancel','revoke_worker'].includes(body.command))input=z.object({id:z.string().uuid()}).parse(body.data);
 if(body.command==='pair')input=z.object({name:z.string().trim().min(1).max(100)}).parse(body.data);
 if(body.command==='pause')input=z.object({paused:z.boolean()}).parse(body.data);
 const {data,error}=await client.rpc('office_command',{p_command:body.command,p_data:input});if(error)throw new Error(error.message);
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}}
