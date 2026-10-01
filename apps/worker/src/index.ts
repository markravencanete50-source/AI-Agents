import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { runHandoff,type Claim,type WorkProgress } from './engine.js';
import { retryRpc } from './rpc-retry.js';
config({path:resolve(import.meta.dirname,'../.env'),quiet:true});
const interrupted=new AbortController();process.on('SIGINT',()=>interrupted.abort());process.on('SIGTERM',()=>interrupted.abort());
const delay=(ms:number)=>new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);interrupted.signal.removeEventListener('abort',finish);resolve();};const timer=setTimeout(finish,ms);interrupted.signal.addEventListener('abort',finish,{once:true});});
async function main(){
 if(process.argv.includes('--check')){const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Ollama is unavailable.');const data=await response.json();console.log('Ollama available. Installed models:',data.models.map((m:{name:string})=>m.name).join(', '));console.log('Worker configuration:',process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY&&process.env.OFFICE_WORKER_TOKEN?'ready':'needs Supabase settings and a paired token');console.log('Codex:',process.env.OFFICE_CODEX_ENABLED==='true'?'read-only reviews enabled':'disabled');return;}
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,token=process.env.OFFICE_WORKER_TOKEN;
 if(!url||!key||!token)throw new Error('Copy apps/worker/.env.worker.example to apps/worker/.env, enter public Supabase settings and pair your laptop from Office Settings.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(12000),...(init?.signal?[init.signal]:[])])})}});
 async function rpc(operation:string,data:Record<string,unknown>={},signal:AbortSignal=interrupted.signal){return retryRpc(operation,async()=>{const {data:result,error}=await db.rpc('office_worker',{p_token:token,p_operation:operation,p_data:data});if(error)throw new Error(error.message);return result;},{signal});}
 console.log('Orbit laptop connected. One handoff runs at a time. Press Ctrl+C to stop.');
 while(!interrupted.signal.aborted){
  try{
   await rpc('hello',{ollama:process.env.OLLAMA_MODEL??'qwen3.5:9b',codex:process.env.OFFICE_CODEX_ENABLED==='true'?'read-only':'disabled'});
   const claim=await rpc('claim') as Claim|null;if(!claim){await delay(5000);continue;}
   console.log(`Working: ${claim.task.agent_id} — task ${claim.task.id}`);
   const controller=new AbortController();const stop=()=>controller.abort(new Error('Worker stopped.'));interrupted.signal.addEventListener('abort',stop,{once:true});
   const timeout=setTimeout(()=>controller.abort(new Error('Handoff exceeded the 15-minute limit.')),900000);
   let leaseLost=false,heartbeatBusy=false;
   let progress:WorkProgress={stage:'Starting handoff',detail:'The laptop has claimed this task.'},reportBusy=false,lastReport=0;
   const report=async()=>{if(reportBusy||controller.signal.aborted)return;reportBusy=true;lastReport=Date.now();try{await rpc('hello',{ollama:process.env.OLLAMA_MODEL??'qwen3.5:9b',codex:process.env.OFFICE_CODEX_ENABLED==='true'?'read-only':'disabled',progress:{...progress,task_id:claim.task.id,agent_id:claim.task.agent_id,attempt_id:claim.attempt_id,updated_at:new Date().toISOString()}},controller.signal);}catch(error){console.error('Work preview delayed:',error instanceof Error?error.message:'Connection unavailable');}finally{reportBusy=false;}};
   const reportTimer=setInterval(()=>{void report();},8000);
   const onProgress=(next:WorkProgress)=>{progress=next;if(Date.now()-lastReport>=8000)void report();};
   const heartbeat=setInterval(async()=>{if(heartbeatBusy||controller.signal.aborted)return;heartbeatBusy=true;try{await rpc('heartbeat',{task_id:claim.task.id,attempt_id:claim.attempt_id},controller.signal);}catch(error){leaseLost=true;controller.abort(new Error(`Heartbeat stopped: ${error instanceof Error?error.message:'Connection unavailable'}`));}finally{heartbeatBusy=false;}},30000);
   try{const output=await runHandoff(claim,controller.signal,onProgress);if(controller.signal.aborted)throw controller.signal.reason;await rpc('complete',{task_id:claim.task.id,attempt_id:claim.attempt_id,output},controller.signal);console.log(`Completed: ${claim.task.agent_id}`);}
   catch(error){if(!leaseLost&&!interrupted.signal.aborted)await rpc('fail',{task_id:claim.task.id,attempt_id:claim.attempt_id,error:error instanceof Error?error.message:'Handoff failed'});console.error('Handoff stopped:',error instanceof Error?error.message:'Execution error');}
   finally{clearInterval(heartbeat);clearInterval(reportTimer);clearTimeout(timeout);controller.abort(new Error('Handoff finished.'));interrupted.signal.removeEventListener('abort',stop);}
  }catch(error){console.error('Worker:',error instanceof Error?error.message:'Connection failed');await delay(10000);}
 }
 console.log('Worker stopped. Interrupted tasks become available after their lease expires.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Worker startup failed');process.exitCode=1;});
