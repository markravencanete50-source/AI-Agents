import { readWebsite } from '../apps/worker/src/safe-fetch.ts';
const page=await readWebsite('https://example.com',AbortSignal.timeout(30000));
console.log(JSON.stringify({url:page.url,htmlBytes:page.html.length,title:page.html.match(/<title>(.*?)<\/title>/)?.[1]},null,2));
