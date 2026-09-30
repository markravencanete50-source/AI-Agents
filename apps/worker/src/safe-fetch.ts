import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import http from 'node:http';
export function isPublicAddress(address:string){
 if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);}
 // IPv6 is deliberately disabled until comprehensive reserved-range tests are added.
 return false;
}
export async function readWebsite(raw:string,signal:AbortSignal,redirects=0):Promise<{url:string;html:string}>{
 const url=new URL(raw);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port))throw new Error('Only public HTTP/HTTPS websites on standard ports are allowed.');
 const addresses=await lookup(url.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new Error('Private or reserved network destinations are blocked.');
 const selected=addresses[0];
 const response=await new Promise<{status:number;location?:string;type:string;html:string}>((resolve,reject)=>{
  const request=(url.protocol==='https:'?https:http).get(url,{signal,family:4,headers:{'user-agent':'OrbitOffice/0.1 (CEO-requested website review)','accept':'text/html'},lookup:(_host,_options,callback)=>callback(null,selected.address,selected.family)},res=>{
   if((res.statusCode??0)>=300&&(res.statusCode??0)<400){res.resume();resolve({status:res.statusCode!,location:res.headers.location,type:'',html:''});return;}
   const chunks:Buffer[]=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>600_000){request.destroy(new Error('Website exceeds the 600 KB review limit.'));return;}chunks.push(Buffer.from(chunk));});
   res.on('end',()=>resolve({status:res.statusCode??0,type:String(res.headers['content-type']??''),html:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);
  });request.setTimeout(20000,()=>request.destroy(new Error('Website timed out.')));request.on('error',reject);
 });
 if(response.location){if(redirects>=3)throw new Error('Too many redirects.');return readWebsite(new URL(response.location,url).toString(),signal,redirects+1);}
 if(response.status<200||response.status>=300)throw new Error(`Website returned HTTP ${response.status}.`);
 if(!response.type.includes('text/html'))throw new Error('Only HTML pages are reviewed.');
 return {url:url.toString(),html:response.html};
}
