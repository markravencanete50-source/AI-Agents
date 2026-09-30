import { authenticatedClient,sameOrigin,apiError } from '@/lib/server';
export async function POST(req:Request){try{sameOrigin(req);const client=await authenticatedClient();const {data,error}=await client.rpc('office_pair_executor');if(error)throw new Error(error.message);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}}
