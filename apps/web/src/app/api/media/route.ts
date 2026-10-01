import { createHash } from 'node:crypto';
import {authenticatedClient,sameOrigin,apiError} from '@/lib/server';
export async function POST(req:Request){try{
 sameOrigin(req);const client=await authenticatedClient();const {data,error}=await client.rpc('office_snapshot');if(error||!data?.workspace)throw new Error('Initialize your office first');
 const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
 if(!cloud||!key||!secret)throw new Error('Cloudinary is not connected');
 const input=await req.json().catch(()=>({}));
 if(input.public_id){
  if(typeof input.public_id!=='string'||!input.public_id.startsWith(`office/${data.workspace.id}/`)||!['image','video'].includes(input.resource_type))throw new Error('Invalid media scope');
  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/${input.resource_type}/authenticated/${encodeURIComponent(input.public_id)}`,{headers:{Authorization:'Basic '+Buffer.from(`${key}:${secret}`).toString('base64')},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!response.ok)throw new Error('Media could not be verified');const media=await response.json();
  const result=await client.rpc('office_record_media',{p_data:{public_id:media.public_id,resource_type:media.resource_type,format:media.format,bytes:media.bytes,width:media.width,height:media.height}});if(result.error)throw new Error(result.error.message);return Response.json({recorded:true},{headers:{'Cache-Control':'no-store'}});
 }
 const timestamp=Math.floor(Date.now()/1000),folder=`office/${data.workspace.id}`;
 const signature=createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}&type=authenticated${secret}`).digest('hex');
 return Response.json({cloud_name:cloud,api_key:key,timestamp,folder,type:'authenticated',signature},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}}
