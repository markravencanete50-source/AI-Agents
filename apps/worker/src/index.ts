import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { runHandoff,type Claim } from './engine.js';
config({path:resolve(import.meta.dirname,'../.env'),quiet:true});
const interrupted=new AbortController();process.on('SIGINT',()=>interrupted.abort());process.on('SIGTERM',()=>interrupted.abort());
const delay=(ms:number)=>new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);interrupted.signal.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,ms);interrupted.signal.addEventListener('abort',finish,{once:true});});
async function main(){
 if(process.argv.includes('--check')){const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Ollama is unavailable.');const data=await response.json();console.log('Ollama available. Installed models:',data.models.map((m:{name:string})=>m.name).join(', '));console.log('Worker configuration:',process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY&&process.env.OFFICE_WORKER_TOKEN?'ready':'needs Supabase settings and a paired token');console.log('Codex:',process.env.OFFICE_CODEX_ENABLED==='true'?'read-only reviews enabled':'disabled');return;}
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,token=process.env.OFFICE_WORKER_TOKEN;
 if(!url||!key||!token)throw new Error('Copy apps/worker/.env.worker.example to apps/worker/.env, enter public Supabase settings and pair your laptop from Office Settings.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 async function rpc(operation:string,data:Record<string,unknown>={}){const {data:result,error}=await db.rpc('office_worker',{p_token:token,p_operation:operation,p_data:data});if(error)throw new Error(error.message);return result;}
 console.log('Orbit laptop connected. One handoff runs at a time. Press Ctrl+C to stop.');
 while(!interrupted.signal.aborted){
  try{
   await rpc('hello',{ollama:process.env.OLLAMA_MODEL??'qwen3.5:9b',codex:process.env.OFFICE_CODEX_ENABLED==='true'?'read-only':'disabled'});
   const claim=await rpc('claim') as Claim|null;if(!claim){await delay(5000);continue;}
   console.log(`Working: ${claim.task.agent_id} — task ${claim.task.id}`);
   const controller=new AbortController();const stop=()=>controller.abort(new Error('Worker stopped.'));interrupted.signal.addEventListener('abort',stop,{once:true});
   const timeout=setTimeout(()=>controller.abort(new Error('Handoff exceeded the 15-minute limit.')),900000);
   let leaseLost=false,heartbeatBusy=false;
   const heartbeat=setInterval(async()=>{if(heartbeatBusy)return;heartbeatBusy=true;try{await rpc('heartbeat',{task_id:claim.task.id,attempt_id:claim.attempt_id});}catch{leaseLost=true;controller.abort(new Error('Lease lost or office paused.'));}finally{heartbeatBusy=false;}},30000);
   try{const output=await runHandoff(claim,controller.signal);if(controller.signal.aborted)throw controller.signal.reason;await rpc('complete',{task_id:claim.task.id,attempt_id:claim.attempt_id,output});console.log(`Completed: ${claim.task.agent_id}`);}
   catch(error){if(!leaseLost&&!interrupted.signal.aborted)await rpc('fail',{task_id:claim.task.id,attempt_id:claim.attempt_id,error:error instanceof Error?error.message:'Handoff failed'});console.error('Handoff stopped:',error instanceof Error?error.message:'Execution error');}
   finally{clearInterval(heartbeat);clearTimeout(timeout);interrupted.signal.removeEventListener('abort',stop);}
  }catch(error){console.error('Worker:',error instanceof Error?error.message:'Connection failed');await delay(10000);}
 }
 console.log('Worker stopped. Interrupted tasks become available after their lease expires.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Worker startup failed');process.exitCode=1;});
