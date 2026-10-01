// A claim may have succeeded even when its response was lost. Never repeat it.
const retryableOperations=new Set(['hello','heartbeat','complete','fail']);
export function isTransportError(error:unknown){
 const message=error instanceof Error?error.message:String(error);
 return /fetch failed|FetchError|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|TimeoutError|signal timed out/i.test(message);
}
export async function retryRpc<T>(operation:string,request:()=>Promise<T>,options:{signal?:AbortSignal;wait?:(ms:number)=>Promise<void>}={}):Promise<T>{
 const wait=options.wait??(ms=>new Promise<void>((resolve,reject)=>{
  const finish=()=>{options.signal?.removeEventListener('abort',abort);resolve();};
  const timer=setTimeout(finish,ms);
  const abort=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);reject(options.signal?.reason);};
  options.signal?.addEventListener('abort',abort,{once:true});
  if(options.signal?.aborted)abort();
 }));
 for(let attempt=0;;attempt++){
  options.signal?.throwIfAborted();
  try{return await request();}
  catch(error){
   options.signal?.throwIfAborted();
   if(!retryableOperations.has(operation)||!isTransportError(error)||attempt>=4)throw error;
   await wait(1000*2**attempt);
  }
 }
}
