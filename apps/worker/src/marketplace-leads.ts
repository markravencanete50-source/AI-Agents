import { load } from 'cheerio';
import { setTimeout as delay } from 'node:timers/promises';
import { leadSearchSchema,leadBatchSchema,type LeadRow,type AgentResult,type Task } from '@office/contracts';
import { readPublicDocument } from './safe-fetch.js';
import type { WorkProgress } from './engine.js';

const services=[
 {name:'Website development',query:'web developer',pattern:/website|web develop|wordpress|shopify|front.?end|back.?end/i},
 {name:'Automation',query:'automation',pattern:/automation|automations|zapier|make\.com|gohighlevel|workflow/i},
 {name:'Executive / admin support',query:'executive assistant',pattern:/assistant|admin|administrative|executive support/i},
 {name:'Operations support',query:'operations specialist',pattern:/operations|operation specialist/i}
];
const clean=(text:string,max=800)=>text.replace(/\s+/g,' ').trim().slice(0,max);
export function searchQueries(brief:string,keywords=''){
 if(keywords.trim())return [...new Set(keywords.split(',').map(q=>clean(q,80)).filter(Boolean))].slice(0,5);
 const matched=services.filter(s=>s.pattern.test(brief));
 return (matched.length?matched:services).map(s=>s.query);
}
type Candidate={title:string;url:string;posted_at:string;budget:string;description:string;company?:string;market:LeadRow['market']};
export function parseOnlineJobs(html:string):Candidate[]{
 const $=load(html);
 return $('.jobpost-cat-box').map((_i,element)=>{
  const card=$(element),heading=card.find('h4').clone();heading.find('.badge').remove();
  const href=card.find('a[href*="/jobseekers/job/"]').first().attr('href');if(!href)return null;
  const url=new URL(href,'https://www.onlinejobs.ph');if(url.hostname!=='www.onlinejobs.ph'||!url.pathname.startsWith('/jobseekers/job/'))return null;
  const date=card.find('[data-temp-2]').attr('data-temp-2');const parsed=date?new Date(date.replace(' ','T')+'Z'):null;
  return {title:clean(heading.text(),300),url:url.origin+url.pathname,posted_at:parsed&&!isNaN(parsed.getTime())?parsed.toISOString():'Not disclosed',budget:clean(card.find('dd').first().text(),200)||'Not disclosed',description:clean(card.find('.desc').text(),4000),market:'OnlineJobs.ph' as const};
 }).get().filter(c=>c.title);
}
export function qualifyLead(candidate:Candidate,description:string,brief:string,checkedAt:string):LeadRow|null{
 const requested=services.filter(s=>s.pattern.test(brief));
 const matched=(requested.length?requested:services).filter(s=>s.pattern.test(candidate.title+' '+description));if(!matched.length)return null;
 if(/(?:job (?:post|posting) (?:is |has )?(?:inactive|expired)|no longer accepting applications)/i.test(description))return null;
 const size=description.match(/\b(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?\s+(?:employees|team members|staff members)\b/i);
 const maxSize=size?Number(size[2]??size[1]):null;
 const small=/1\s*[-–]\s*10|small (?:business|startup)|startup/i.test(brief);
 if(small&&maxSize!==null&&maxSize>10)return null;
 const company=clean(candidate.company??description.match(/\bcompany\s*:\s*([^\n.;]{2,100})/i)?.[1]??'Not disclosed',200);
 return {title:candidate.title,company,market:candidate.market,service:matched.map(s=>s.name).join(', ').slice(0,100),url:candidate.url,posted_at:candidate.posted_at,checked_at:checkedAt,budget:candidate.budget,location:/\bworldwide|anywhere in the world\b/i.test(description)?'Worldwide (stated in posting)':'Not disclosed',company_size:size?size[0]:'Not disclosed',icp_status:maxSize!==null?'Hiring need matched; stated size recorded':'Hiring need matched; company size unverified',evidence:clean(description,800),notes:small?'Check startup status and team size before treating this as a confirmed ICP match.':'Public hiring opportunity; no outreach has been sent.'};
}
export function robotsPolicy(text:string,path:string){
 let agents:string[]=[],rules:{allow:boolean;path:string}[]=[],crawlDelay=5,hasRules=false;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.split('#')[0].trim(),split=line.indexOf(':');if(split<0)continue;
  const key=line.slice(0,split).toLowerCase(),value=line.slice(split+1).trim();
  if(key==='user-agent'){if(hasRules){agents=[];hasRules=false;}agents.push(value.toLowerCase());continue;}
  hasRules=true;if(!agents.includes('*')&&!agents.includes('orbitoffice'))continue;
  if(key==='crawl-delay'&&Number.isFinite(Number(value)))crawlDelay=Math.max(5,Number(value));
  if((key==='allow'||key==='disallow')&&value)rules.push({allow:key==='allow',path:value});
 }
 rules=rules.filter(rule=>new RegExp('^'+rule.path.split('*').map(part=>part.replace(/[.+?^{}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$')).test(path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return {allowed:rules[0]?.allow??true,crawlDelay:Math.min(crawlDelay,60)};
}
export async function discoverLeads(task:Task,signal:AbortSignal,onProgress:(progress:WorkProgress)=>void):Promise<AgentResult>{
 const options=leadSearchSchema.parse(task.input.lead_search??{}),queries=searchQueries(task.title,options.keywords);
 const rows:LeadRow[]=[],searches:ReturnType<typeof leadBatchSchema.parse>['searches']=[],seen=new Set<string>(),fingerprints=new Set<string>();
 const robots=new Map<string,string>(),lastRequest=new Map<string,number>();
 const request=async(url:string,maxBytes:number,interval=5)=>{
  const host=new URL(url).origin;
  for(let attempt=0;attempt<3;attempt++){
   await delay(Math.max(0,(lastRequest.get(host)??0)+interval*1000-Date.now()),undefined,{signal});lastRequest.set(host,Date.now());
   try{return await readPublicDocument(url,signal,{maxBytes,allowRedirects:false});}catch(error){if(signal.aborted||/HTTP (?:4\d\d|5\d\d)|too large|not public|blocked|redirect/i.test(String(error))||attempt===2)throw error;}
  }
  throw new Error('Public source unavailable');
 };
 const read=async(url:string,maxBytes=600000)=>{
  const u=new URL(url);if(!robots.has(u.origin))robots.set(u.origin,(await request(u.origin+'/robots.txt',50000)).body);
  const policy=robotsPolicy(robots.get(u.origin)!,u.pathname+u.search);if(!policy.allowed)throw new Error('Source disallows this path in robots.txt');
  return request(url,maxBytes,policy.crawlDelay);
 };
 const recent=(c:Candidate)=>c.posted_at==='Not disclosed'||Date.parse(c.posted_at)>=Date.now()-options.days*86400000;
 let checked=0;
 for(const market of [...new Set(options.markets)]){
  if(market==='onlinejobs')for(const query of queries){
   if(rows.length>=options.limit)break;
   const url='https://www.onlinejobs.ph/jobseekers/jobsearch?'+new URLSearchParams({jobkeyword:query});
   const queryTarget=Math.min(options.limit,rows.length+Math.ceil(options.limit/queries.length));
   const record={market:'OnlineJobs.ph',query,url,status:'searched' as 'searched'|'unavailable',count:0,note:''};searches.push(record);
   onProgress({stage:'Searching OnlineJobs.ph',detail:`Searching public listings for “${query}”. ${rows.length} opportunities collected.`});
   try{
    const page=await read(url);if(!page.contentType.includes('text/html'))throw new Error('Expected public listing HTML');
    const candidates=parseOnlineJobs(page.body);record.count=candidates.length;
    if(!candidates.length&&!/no (?:jobs|results)|0 jobs|no job/i.test(page.body))throw new Error('Public listings were not readable; no leads inferred');
    for(const candidate of candidates.filter(recent)){
     if(rows.length>=queryTarget||checked>=Math.min(options.limit*3,60))break;
     if(seen.has(candidate.url)||!qualifyLead(candidate,candidate.description,task.title,new Date().toISOString()))continue;
     seen.add(candidate.url);checked++;onProgress({stage:'Checking marketplace posting',detail:`${candidate.title} · ${rows.length} of up to ${options.limit} opportunities collected.`});
     try{
      const detail=await read(candidate.url),$=load(detail.body);const description=$('#job-description').text();if(!description.trim())throw new Error('Public job overview unavailable');
      const row=qualifyLead(candidate,description,task.title,new Date().toISOString());if(!row)continue;
      const fingerprint=(row.title+'|'+row.company+'|'+clean(description,160)).toLowerCase();if(fingerprints.has(fingerprint))continue;
      fingerprints.add(fingerprint);rows.push(row);
     }catch(error){if(signal.aborted)throw error;record.note=clean(record.note+' Some postings could not be read and were excluded.',500);}
    }
   }catch(error){if(signal.aborted)throw error;record.status='unavailable';record.note=clean(error instanceof Error?error.message:'Source unavailable',500);}
  }
  else{
   const url='https://weworkremotely.com/remote-jobs.rss',record={market:'We Work Remotely',query:queries.join(', '),url,status:'searched' as 'searched'|'unavailable',count:0,note:'Public RSS feed evidence; individual posting pages have not been checked.'};searches.push(record);
   onProgress({stage:'Searching We Work Remotely',detail:'Reading the public jobs feed.'});
   try{
    const page=await read(url,2000000),$=load(page.body,{xmlMode:true});if(!$('rss').length)throw new Error('Public RSS feed unavailable');
    record.count=$('item').length;
    for(const item of $('item').toArray()){
     if(rows.length>=options.limit)break;const node=$(item),title=node.find('title').text(),link=node.find('link').text().trim();
     if(!/^https:\/\/weworkremotely\.com\/remote-jobs\//.test(link))continue;
     const date=new Date(node.find('pubDate').text()),description=load(node.find('description').text()).text();
     const candidate:Candidate={title:clean(title.includes(':')?title.split(':').slice(1).join(':'):title,300),company:title.includes(':')?clean(title.split(':')[0],200):undefined,url:link,description,budget:'Not disclosed',market:'We Work Remotely',posted_at:isNaN(date.getTime())?'Not disclosed':date.toISOString()};
     if(!recent(candidate)||seen.has(link))continue;const row=qualifyLead(candidate,description,task.title,new Date().toISOString());if(row){row.notes=clean(row.notes+' Feed evidence; posting page not checked.',500);rows.push(row);seen.add(link);}
    }
   }catch(error){if(signal.aborted)throw error;record.status='unavailable';record.note=clean(error instanceof Error?error.message:'Source unavailable',500);}
  }
 }
 if(searches.every(s=>s.status==='unavailable'))throw new Error('Marketplace search unavailable. '+searches.map(s=>s.market+': '+s.note).join(' ').slice(0,1200));
 onProgress({stage:'Preparing Excel lead list',detail:`Saving ${rows.length} factual opportunities and the search log.`});
 const batch=leadBatchSchema.parse({generated_at:new Date().toISOString(),brief:task.title,rows,searches});
 const limitations=['These are public hiring opportunities. Company size and startup status are unverified unless explicitly stated in a posting.','Search covers the selected public marketplaces and a bounded set of recent listings, not every website.'];
 if(searches.some(s=>s.status==='unavailable'||s.note.includes('excluded')))limitations.push('Some sources or postings were unavailable. See the Excel search log for coverage.');
 return {summary:rows.length?`${rows.length} public hiring opportunities collected. Excel lead list ready.`:'No matching public opportunities found in the searched listings. Excel search log ready.',deliverable:`Collected ${rows.length} public hiring opportunities matching the service needs in your brief. Download the Excel workbook for posting links, dates, budgets, hiring evidence and qualification notes.\n\n${rows.filter(r=>r.company_size==='Not disclosed').length} opportunities require company-size verification. No messages were sent and no Make connection was used.\n\nSearches:\n${searches.map(s=>`${s.market}: ${s.query} — ${s.status} (${s.count} candidate listings). ${s.note}`).join('\n')}`,sources:rows.slice(0,25).map(r=>({title:r.title.slice(0,200),url:r.url})),limitations,lead_batch:batch};
}
