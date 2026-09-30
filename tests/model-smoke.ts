import { runHandoff,type Claim } from '../apps/worker/src/engine.ts';
const started=Date.now();
const claim={task:{id:'local-smoke',workspace_id:'local',objective_id:'local',project_id:null,title:'Prepare a three-step internal checklist for reviewing a client website. No email or external actions.',template:'automation',agent_id:'coo',step:0,status:'working',input:{domains:[]},output:null,error:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()},attempt_id:'local',handoffs:[],project:null} satisfies Claim;
const result=await runHandoff(claim,AbortSignal.timeout(180000));
console.log(JSON.stringify({model:process.env.OLLAMA_MODEL??'qwen3.5:9b',seconds:Math.round((Date.now()-started)/1000),summary:result.summary,deliverable:result.deliverable,limitations:result.limitations,emailProposed:!!result.email},null,2));
