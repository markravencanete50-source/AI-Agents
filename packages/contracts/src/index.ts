import { z } from 'zod';

export const agents = [
  {id:'coo',name:'Atlas',role:'Chief Operating Officer',short:'COO',department:'executive',color:'#344d48',provider:'ollama',mission:'Turn the CEO objective into a bounded brief. Check evidence, dependencies and decisions. Never authorize an external action.'},
  {id:'leads',name:'Scout',role:'Lead Generation Specialist',short:'Lead Generation',department:'growth',color:'#e6a95c',provider:'ollama',mission:'Qualify supplied prospects using source evidence. Prepare factual outreach drafts. Never invent contacts or send email.'},
  {id:'automation',name:'Relay',role:'Automation Specialist',short:'Automation',department:'operations',color:'#7b98b6',provider:'ollama',mission:'Design versioned Make scenarios, mapping, tests and recovery. Produce a proposal; never activate external writes.'},
  {id:'principal',name:'Archer',role:'Principal Developer',short:'Principal Dev',department:'engineering',color:'#5c86a4',provider:'codex',mission:'Review architecture and interface contracts. Assign bounded file scopes. Produce integration and release evidence. No production access.'},
  {id:'frontend',name:'Pixel',role:'Frontend Developer',short:'Frontend',department:'engineering',color:'#6b9fb0',provider:'codex',mission:'Review accessible responsive interfaces and propose scoped changes in the registered repository. Applied edits wait for the worktree execution gate.'},
  {id:'backend',name:'Forge',role:'Backend Developer',short:'Backend',department:'engineering',color:'#507d93',provider:'codex',mission:'Review server contracts, validation and migrations, and propose scoped changes. Applied edits wait for the execution gate; production migrations require CEO approval.'},
  {id:'qa',name:'Sentry',role:'QA Developer',short:'QA Engineer',department:'engineering',color:'#7891aa',provider:'codex',mission:'Independently inspect the change and report reproducible checks and failures. Distinguish executed tests from suggested tests. Never mark an unrun check passed.'},
  {id:'seo-principal',name:'Sage',role:'Principal SEO Strategist',short:'SEO Principal',department:'search',color:'#9d82bb',provider:'ollama',mission:'Prioritize a source-grounded SEO roadmap. Separate measurements from inference and coordinate specialist handoffs.'},
  {id:'technical-seo',name:'Index',role:'Technical SEO Specialist',short:'Technical SEO',department:'search',color:'#927db3',provider:'ollama',mission:'Use fetched page evidence for crawlability, canonicals, metadata and performance recommendations. Do not invent index or traffic data.'},
  {id:'keywords',name:'Query',role:'Keyword & Competitor Research',short:'Research',department:'search',color:'#b294c4',provider:'ollama',mission:'Build intent and competitor briefs from supplied evidence. Clearly mark search-volume and rank metrics unavailable unless supplied.'},
  {id:'content',name:'Quill',role:'Content SEO Specialist',short:'Content SEO',department:'search',color:'#aa8dc5',provider:'ollama',mission:'Draft useful factual on-page copy, titles and internal links. Cite supporting sources and separate new draft text from published content.'},
  {id:'aeo-geo',name:'Echo',role:'AEO / GEO Specialist',short:'AEO / GEO',department:'search',color:'#8f79a6',provider:'ollama',mission:'Improve answer clarity and source-supported passages. Do not promise AI citations or fabricate engine visibility metrics.'},
  {id:'schema',name:'Struct',role:'Structured Data Specialist',short:'Schema',department:'search',color:'#b39cc9',provider:'ollama',mission:'Propose applicable JSON-LD consistent with visible content. Do not invent reviews, ratings or entities.'},
  {id:'analytics',name:'Lens',role:'Analytics & Reporting',short:'Analytics',department:'search',color:'#9f8caf',provider:'ollama',mission:'Report dated measurements and explicit gaps. Do not turn general search totals into an AI-only traffic metric.'},
  {id:'seo-qa',name:'Proof',role:'SEO QA Specialist',short:'SEO QA',department:'search',color:'#c0accd',provider:'ollama',mission:'Review evidence and recommendations independently. Surface unsupported claims and implementation risks.'}
] as const;
export type Agent = typeof agents[number];
export type AgentId = Agent['id'];
export const templates = {
  leads: {name:'Lead generation',description:'Research supplied prospects and prepare outreach for your review.',roles:['coo','leads','coo']},
  development: {name:'Website development',description:'Principal-led frontend, backend and independent QA handoffs.',roles:['principal','frontend','backend','qa','principal']},
  seo: {name:'SEO · AEO · GEO audit',description:'Eight specialists review source evidence and prepare a roadmap.',roles:['seo-principal','technical-seo','keywords','content','aeo-geo','schema','analytics','seo-qa']},
  automation: {name:'Make automation',description:'A versioned scenario proposal, test plan and COO review.',roles:['coo','automation','coo']}
} as const;
const websiteUrl=z.string().url().refine(value=>['https:','http:'].includes(new URL(value).protocol),'Use an HTTP or HTTPS URL');
export const objectiveSchema = z.object({title:z.string().trim().min(8).max(1200),template:z.enum(['leads','development','seo','automation']),project_id:z.string().uuid().nullable().optional(),input:z.object({domains:z.array(websiteUrl).max(10).default([]),recipient:z.string().email().optional(),repository_key:z.string().regex(/^[a-z0-9_-]{1,60}$/i).optional()}).default({domains:[]})});
export const projectSchema = z.object({name:z.string().trim().min(2).max(100),url:websiteUrl.optional().or(z.literal('')),repository:z.string().url().refine(value=>new URL(value).origin==='https://github.com','Use a GitHub repository URL').optional().or(z.literal(''))});
export const emailSchema = z.object({kind:z.literal('email'),account:z.literal('gmail'),to:z.string().email(),subject:z.string().min(1).max(200),body:z.string().min(1).max(12000)}).strict();
export const resultSchema = z.object({summary:z.string().min(1).max(2000),deliverable:z.string().min(1).max(50000),sources:z.array(z.object({url:z.string().url(),title:z.string().max(200)})).max(25).default([]),limitations:z.array(z.string().max(500)).max(20).default([]),email:emailSchema.optional()});
export type AgentResult = z.infer<typeof resultSchema>;
export type Template = keyof typeof templates;
export type Task = {id:string;workspace_id:string;objective_id:string;project_id:string|null;title:string;template:Template;agent_id:AgentId;step:number;status:'blocked'|'queued'|'working'|'completed'|'failed'|'cancelled';input:Record<string,unknown>;output:AgentResult|null;error:string|null;created_at:string;updated_at:string};
export type Action = {id:string;task_id:string;workspace_id:string;snapshot:z.infer<typeof emailSchema>;snapshot_hash:string;status:'proposed'|'approved'|'rejected'|'revoked'|'dispatching'|'executing'|'succeeded'|'outcome_unknown';expires_at:string|null;created_at:string;provider_id:string|null};
export type Project = {id:string;name:string;url:string|null;repository:string|null;created_at:string};
export type Worker = {id:string;name:string;last_seen:string|null;revoked:boolean;capabilities:Record<string,unknown>};
export type OfficeEvent = {id:string;seq:number;kind:string;payload:Record<string,unknown>;created_at:string};
export type Snapshot = {workspace:{id:string;name:string;paused:boolean;event_seq:number}|null;projects:Project[];tasks:Task[];actions:Action[];workers:Worker[];events:OfficeEvent[]};
export const emptySnapshot:Snapshot={workspace:null,projects:[],tasks:[],actions:[],workers:[],events:[]};
export function role(id:string){return agents.find(a=>a.id===id)??agents[0];}
