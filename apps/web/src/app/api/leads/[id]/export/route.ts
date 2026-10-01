import { z } from 'zod';
import { leadBatchSchema } from '@office/contracts';
import { authenticatedClient,apiError } from '@/lib/server';
import { leadWorkbook } from '@/lib/lead-workbook';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const client=await authenticatedClient(),{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return Response.json({error:'Invalid task ID'},{status:400});
  // The signed-in client's RLS restricts this lookup to its own workspace.
  const {data,error}=await client.from('office_tasks').select('output').eq('id',id).eq('agent_id','leads').eq('status','completed').single();
  const parsed=leadBatchSchema.safeParse(data?.output?.lead_batch);
  if(error||!parsed.success)return Response.json({error:'No Excel lead list for this report. Run a new marketplace lead objective.'},{status:404});
  const bytes=await leadWorkbook(parsed.data);
  return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="orbit-leads-${id.slice(0,8)}.xlsx"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return apiError(error);}
}
