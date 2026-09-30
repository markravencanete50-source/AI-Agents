import { type Snapshot, type Task } from '@office/contracts';
const now=new Date('2026-09-30T10:00:00Z').toISOString();
export const demoSnapshot:Snapshot={
 workspace:{id:'demo',name:'My company',paused:false,event_seq:4},
 projects:[{id:'demo-project',name:'Company website',url:'https://example.com',repository:null,created_at:now}],
 tasks:[
 {id:'demo-1',workspace_id:'demo',objective_id:'demo-objective',project_id:'demo-project',title:'Prepare a website improvement roadmap',template:'seo',agent_id:'technical-seo',step:1,status:'working',input:{},output:null,error:null,created_at:now,updated_at:now},
 {id:'demo-2',workspace_id:'demo',objective_id:'demo-leads',project_id:'demo-project',title:'Research a small batch of prospects',template:'leads',agent_id:'leads',step:1,status:'working',input:{},output:null,error:null,created_at:now,updated_at:now},
 {id:'demo-3',workspace_id:'demo',objective_id:'demo-dev',project_id:'demo-project',title:'Review the new landing page',template:'development',agent_id:'qa',step:3,status:'completed',input:{},output:{summary:'A sample review, ready to explore.',deliverable:'This is a demonstration of an agent deliverable. Live work will include its actual evidence, findings and limitations.',sources:[],limitations:['Demonstration only. No tests were executed.']},error:null,created_at:now,updated_at:now}
 ] as Task[],
 actions:[],workers:[],events:[{id:'demo-event',seq:1,kind:'demo.loaded',payload:{title:'Explore your office. Sign in to start real work.'},created_at:now}]
};
