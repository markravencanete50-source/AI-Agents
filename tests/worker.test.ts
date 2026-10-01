import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress,readWebsite } from '../apps/worker/src/safe-fetch.ts';
import { parseResult,cleanModelEnvironment,codexOutputSchema,suppliedWebsites } from '../apps/worker/src/engine.ts';
import { objectiveSchema,projectSchema,agents,templates } from '../packages/contracts/src/index.ts';
import { requestOrigin } from '../apps/web/src/lib/request-origin.ts';
test('websites supplied in the CEO brief are reviewed without inventing destinations',()=>{
 assert.deepEqual(suppliedWebsites({title:'Review https://example.com/. Then qualify prospects.',input:{domains:['https://example.com/']}} as never,null),['https://example.com/']);
 assert.deepEqual(suppliedWebsites({title:'Find prospects anywhere',input:{}} as never,null),[]);
});
test('callback uses the public proxy origin and rejects malformed hosts',()=>{
 assert.equal(requestOrigin(new Request('http://localhost:3000/auth/callback',{headers:{host:'office.example.com','x-forwarded-proto':'https','x-forwarded-host':'evil.example'}})),'https://office.example.com');
 assert.throws(()=>requestOrigin(new Request('http://localhost:3000/',{headers:{host:'office.example.com/other'}})));
 assert.throws(()=>requestOrigin(new Request('http://localhost:3000/',{headers:{host:'office.example.com','x-forwarded-proto':'javascript'}})));
});
test('fetch also blocks documentation and deprecated relay networks',()=>{for(const ip of ['192.0.2.1','198.51.100.1','203.0.113.1','192.88.99.1','198.18.0.1'])assert.equal(isPublicAddress(ip),false,ip);});
test('fetch blocks private, link-local, loopback and metadata addresses',()=>{for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.2','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(isPublicAddress(ip),false,ip);assert.equal(isPublicAddress('93.184.216.34'),true);});
test('fetch refuses credentials, custom ports and nonweb protocols',async()=>{for(const url of ['file:///etc/passwd','http://me:secret@example.com','http://example.com:11434'])await assert.rejects(()=>readWebsite(url,AbortSignal.timeout(1000)));});
test('structured handoffs reject arbitrary email tools and incomplete output',()=>{assert.throws(()=>parseResult('{"summary":"ok"}'));assert.throws(()=>parseResult(JSON.stringify({summary:'ok',deliverable:'review',email:{kind:'email',account:'gmail',to:'test@example.com',subject:'hi',body:'draft',command:'send'}})));const result=parseResult('```json\n{"summary":"Checked supplied page","deliverable":"Evidence with explicit gaps"}\n```');assert.deepEqual(result.sources,[]);assert.deepEqual(result.limitations,[]);});
test('model subprocess never inherits worker, provider or billing credentials',()=>{const env=cleanModelEnvironment({PATH:'safe-path',OFFICE_WORKER_TOKEN:'secret',SUPABASE_SERVICE_ROLE_KEY:'secret',OPENAI_API_KEY:'secret',MAKE_SIGNING_SECRET:'secret'});assert.deepEqual(env,{PATH:'safe-path'});});
test('project and objective links reject script URLs and foreign repository hosts',()=>{assert.equal(projectSchema.safeParse({name:'Project',url:'javascript:alert(1)'}).success,false);assert.equal(projectSchema.safeParse({name:'Project',repository:'https://evil.example/repo'}).success,false);assert.equal(objectiveSchema.safeParse({title:'Review our website',template:'seo',input:{domains:['file:///secret']}}).success,false);});
test('every workflow maps to installed roles with independent development and SEO QA',()=>{assert.equal(agents.length,18);for(const workflow of Object.values(templates))for(const id of workflow.roles)assert(agents.some(a=>a.id===id));assert(templates.development.roles.includes('qa'));assert(templates.seo.roles.includes('seo-qa'));assert(templates.social.roles.includes('video'));assert(templates.design.roles.includes('designer'));});
test('Codex schema removes unsupported URI formats while runtime still validates source URLs',()=>{assert.deepEqual(codexOutputSchema({type:'object',properties:{url:{type:'string',format:'uri',default:'https://example.com'}},required:['url']}),{type:'object',properties:{url:{type:'string'}},required:['url']});assert.throws(()=>parseResult('{"summary":"Review","deliverable":"A proposed handoff","sources":[{"url":"not a URL","title":"Source"}]}'));});
test('model sources cannot create executable or local file links',()=>{for(const url of ['javascript:alert(1)','file:///secret'])assert.throws(()=>parseResult(JSON.stringify({summary:'Review',deliverable:'Evidence',sources:[{url,title:'Source'}]})));});
