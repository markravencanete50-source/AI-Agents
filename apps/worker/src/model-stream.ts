// Only expose the user-facing deliverable, never thinking or raw model JSON.
export function draftDeliverable(json:string){
 const match=/"deliverable"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(json);
 if(!match)return '';
 let value=match[1];
 // A network chunk can end halfway through a JSON escape.
 value=value.replace(/\\(?:u[0-9a-f]{0,3})?$/i,'');
 try{return (JSON.parse('"'+value+'"') as string).slice(0,6000);}catch{return '';}
}
export async function readModelStream(response:Response,onDraft:(draft:string)=>void){
 if(!response.body)throw new Error('Ollama returned an empty stream.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',content='',finished=false;
 function line(value:string){
  if(!value.trim())return;
  const chunk=JSON.parse(value);
  if(chunk.error)throw new Error(String(chunk.error));
  if(typeof chunk.message?.content==='string')content+=chunk.message.content;
  if(content.length>150000)throw new Error('Model response exceeded the handoff limit.');
  const draft=draftDeliverable(content);if(draft)onDraft(draft);
  if(chunk.done)finished=true;
 }
 try{while(true){const next=await reader.read();pending+=decoder.decode(next.value,{stream:!next.done});let end;while((end=pending.indexOf('\n'))!==-1){line(pending.slice(0,end));pending=pending.slice(end+1);}if(next.done)break;}line(pending);}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(!finished)throw new Error('Model stream ended before the handoff was complete.');
 return content;
}
