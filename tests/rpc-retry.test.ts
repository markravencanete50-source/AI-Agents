import test from 'node:test';
import assert from 'node:assert/strict';
import { retryRpc } from '../apps/worker/src/rpc-retry.ts';

test('transient heartbeat failures preserve work until the connection returns',async()=>{
 let calls=0;
 assert.equal(await retryRpc('heartbeat',async()=>{if(++calls<3)throw new Error('TypeError: fetch failed');return 'renewed';},{wait:async()=>{}}),'renewed');
 assert.equal(calls,3);
});
test('lost claim responses are never retried to avoid claiming a second task',async()=>{
 let calls=0;
 await assert.rejects(retryRpc('claim',async()=>{calls++;throw new Error('fetch failed');},{wait:async()=>{}}));
 assert.equal(calls,1);
});
test('revocation, pause and lease errors stop immediately',async()=>{
 for(const message of ['Invalid or revoked worker','Office paused','Lease lost or task cancelled']){
  let calls=0;
  await assert.rejects(retryRpc('heartbeat',async()=>{calls++;throw new Error(message);},{wait:async()=>{}}));
  assert.equal(calls,1);
 }
});
test('retries are bounded and cancellation prevents another request',async()=>{
 let calls=0;
 await assert.rejects(retryRpc('heartbeat',async()=>{calls++;throw new Error('fetch failed');},{wait:async()=>{}}));
 assert.equal(calls,5);
 const controller=new AbortController();calls=0;
 await assert.rejects(retryRpc('heartbeat',async()=>{calls++;throw new Error('fetch failed');},{signal:controller.signal,wait:async()=>{controller.abort(new Error('cancelled'));}}),/cancelled/);
 assert.equal(calls,1);
});
