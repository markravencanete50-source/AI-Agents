import assert from 'node:assert/strict';
const base=process.env.OFFICE_TEST_URL??'http://127.0.0.1:3000';
for(const path of ['/api/office','/api/integrations']){const response=await fetch(base+path);assert.equal(response.status,401,path);}
for(const path of ['/api/office','/api/dispatch','/api/media','/api/executor']){const response=await fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(response.status,401,path);}
const cross=await fetch(base+'/api/office',{method:'POST',headers:{origin:'https://untrusted.example','content-type':'application/json'},body:'{}'});assert.equal(cross.status,400);
for(const path of ['/api/make/verify','/api/make/result']){const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(response.status,403,path);}
console.log('API authentication, same-origin, and unsigned Make request checks passed.');
