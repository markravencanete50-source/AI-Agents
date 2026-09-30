import { Codex } from '@openai/codex-sdk';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanModelEnvironment,subscriptionConfiguration } from '../apps/worker/src/engine.ts';
const directory=await mkdtemp(join(tmpdir(),'orbit-subscription-check-'));
const codex=new Codex({env:cleanModelEnvironment(process.env),config:await subscriptionConfiguration()});
const thread=codex.startThread({workingDirectory:directory,skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled',modelReasoningEffort:'low'});
const started=Date.now();
const stream=await thread.runStreamed('Without using tools, calculate 2+2. Return only the answer in the supplied JSON schema.',{signal:AbortSignal.timeout(120000),outputSchema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false}});
for await(const event of stream.events){
 if(event.type==='item.completed'&&event.item.type==='agent_message')console.log(JSON.stringify({seconds:Math.round((Date.now()-started)/1000),response:event.item.text}));
 else if(event.type==='turn.failed')throw new Error(event.error.message);
 else console.log(JSON.stringify({event:event.type}));
}
