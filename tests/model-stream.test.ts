import test from 'node:test';
import assert from 'node:assert/strict';
import { draftDeliverable,readModelStream } from '../apps/worker/src/model-stream.ts';
test('draft preview reveals only deliverable text and decodes split JSON escapes',()=>{
 assert.equal(draftDeliverable('{"summary":"Overview","deliverable":"Hello\\nworld'),'Hello\nworld');
 assert.equal(draftDeliverable('{"deliverable":"Hello\\u20'),'Hello');
 assert.equal(draftDeliverable('{"summary":"private internal text"'), '');
});
test('NDJSON chunks preserve split UTF-8 and never expose thinking',async()=>{
 const text=JSON.stringify({message:{thinking:'private',content:'{"deliverable":"Résumé'},done:false})+'\n'+JSON.stringify({message:{content:' done"}'},done:true});
 const bytes=new TextEncoder().encode(text);const chunks=[bytes.slice(0,73),bytes.slice(73,74),bytes.slice(74)];
 const response=new Response(new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);controller.close();}}));
 const drafts:string[]=[];
 assert.equal(await readModelStream(response,draft=>drafts.push(draft)),'{"deliverable":"Résumé done"}');
 assert(drafts.every(d=>!d.includes('private')));
 assert.equal(drafts.at(-1),'Résumé done');
});
test('unfinished and error streams cannot become saved handoffs',async()=>{
 await assert.rejects(readModelStream(new Response('{"message":{"content":"partial"}}\n'),()=>{}),/before.*complete/);
 await assert.rejects(readModelStream(new Response('{"error":"model unavailable"}\n'),()=>{}),/model unavailable/);
});
