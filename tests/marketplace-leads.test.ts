import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { searchQueries,parseOnlineJobs,qualifyLead,robotsPolicy } from '../apps/worker/src/marketplace-leads.ts';
import { objectiveSchema,leadBatchSchema,templates } from '../packages/contracts/src/index.ts';
import { leadWorkbook } from '../apps/web/src/lib/lead-workbook.ts';

const html='<div class="jobpost-cat-box"><h4>Web developer <span class="badge">Full time</span></h4><a href="/jobseekers/job/web-developer-123">Read</a><p data-temp-2="2026-10-01 07:13:18"></p><dd>$10/hour</dd><div class="desc">Hiring a website developer</div></div>';
const candidate=parseOnlineJobs(html)[0];
test('marketplace discovery uses the brief and strips URL / outreach dependencies',()=>{
 assert.deepEqual(searchQueries('Website and automation support'),['web developer','automation']);
 assert.deepEqual(templates.leads.roles,['leads']);
 const data=objectiveSchema.parse({title:'Find startup prospects',template:'leads',input:{domains:['https://example.com'],recipient:'test@example.com'}});
 assert.deepEqual(Object.keys(data.input),['lead_search']);
});
test('posting parser preserves factual date, title and canonical marketplace link',()=>{
 assert.equal(candidate.title,'Web developer');assert.equal(candidate.posted_at,'2026-10-01T07:13:18.000Z');assert.equal(candidate.url,'https://www.onlinejobs.ph/jobseekers/job/web-developer-123');
});
test('unknown employee counts remain unverified and explicit oversized companies are excluded',()=>{
 const row=qualifyLead(candidate,'We are hiring a web developer.','Startups 1-10 employees, websites',new Date().toISOString());
 assert.equal(row?.company_size,'Not disclosed');assert.match(row!.icp_status,/unverified/);
 assert.equal(qualifyLead(candidate,'We have 50 employees and need a web developer.','Startups 1-10 employees, websites',new Date().toISOString()),null);
 assert.equal(qualifyLead(candidate,'This job posting is inactive. Need a web developer.','Websites',new Date().toISOString()),null);
});
test('robots exclusion and longest allow rule are respected with a five-second minimum',()=>{
 const robots='User-agent: *\nDisallow: /private\nAllow: /private/public\nCrawl-delay: 8\nUser-agent: Other\nDisallow: /';
 assert.equal(robotsPolicy(robots,'/private/secret').allowed,false);assert.equal(robotsPolicy(robots,'/private/public').allowed,true);assert.equal(robotsPolicy(robots,'/jobs').crawlDelay,8);
});
test('Excel exports actual structured leads and keeps untrusted cells as text',async()=>{
 const row=qualifyLead(candidate,'Company: Acme\nHiring web developer.','Website leads',new Date().toISOString())!;row.title='=HYPERLINK("https://evil.example","click")';
 const batch=leadBatchSchema.parse({generated_at:new Date().toISOString(),brief:'Website leads',rows:[row],searches:[{market:'OnlineJobs.ph',query:'web developer',url:'https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=web+developer',status:'searched',count:1,note:''}]});
 const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await leadWorkbook(batch)) as never);
 assert.equal(book.getWorksheet('Leads')?.getCell('A5').value,row.title);assert.notEqual(book.getWorksheet('Leads')?.getCell('A5').type,ExcelJS.ValueType.Formula);
 assert.equal(book.getWorksheet('Leads')?.getCell('K5').hyperlink,row.url);assert.equal(book.getWorksheet('Search log')?.getCell('D2').value,1);
 assert.equal(leadBatchSchema.safeParse({...batch,rows:[{...row,url:'https://evil.example'}]}).success,false);
});
