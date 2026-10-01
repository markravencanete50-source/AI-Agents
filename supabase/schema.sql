-- Additive initial schema. All privileged implementations live outside the Data API.
create schema if not exists app_private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgmq;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, anon;

create table app_private.settings (key text primary key, value text);
insert into app_private.settings values ('ceo_email',null);
create table public.office_workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id),
 name text not null default 'My company', paused boolean not null default false, event_seq bigint not null default 0,
 created_at timestamptz not null default now()
);
create table public.office_projects (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.office_workspaces(id),
 name text not null check(length(name) between 2 and 100), url text, repository text, created_at timestamptz not null default now(),
 unique(id,workspace_id)
);
create table public.office_tasks (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.office_workspaces(id),
 objective_id uuid not null, project_id uuid, title text not null, template text not null check(template in ('leads','development','seo','automation')),
 agent_id text not null, step int not null, status text not null check(status in ('blocked','queued','working','completed','failed','cancelled')),
 input jsonb not null default '{}', output jsonb, error text, previous_task_id uuid references public.office_tasks(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(objective_id,step),unique(id,workspace_id),
 foreign key(project_id,workspace_id) references public.office_projects(id,workspace_id)
);
create table public.office_actions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.office_workspaces(id),
 task_id uuid not null, snapshot jsonb not null, snapshot_hash text not null,
 status text not null default 'proposed' check(status in ('proposed','approved','rejected','revoked','dispatching','succeeded','outcome_unknown')),
 approved_by uuid references auth.users(id), expires_at timestamptz, provider_id text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(task_id,workspace_id) references public.office_tasks(id,workspace_id), unique(task_id)
);
create table public.office_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.office_workspaces(id),
 seq bigint not null, kind text not null, payload jsonb not null, created_at timestamptz not null default now(),unique(workspace_id,seq)
);
create table public.office_workers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.office_workspaces(id),
 name text not null, last_seen timestamptz, revoked boolean not null default false, capabilities jsonb not null default '{}',
 created_at timestamptz not null default now(), unique(id,workspace_id)
);
create table app_private.worker_credentials (
 worker_id uuid primary key references public.office_workers(id), token_hash text not null unique
);
create table app_private.jobs (
 task_id uuid primary key references public.office_tasks(id), worker_id uuid references public.office_workers(id),
 message_id bigint, attempt_id uuid, lease_until timestamptz, attempts int not null default 0
);
create index office_tasks_workspace on public.office_tasks(workspace_id,created_at desc);
create index office_projects_workspace on public.office_projects(workspace_id);
create index office_actions_workspace on public.office_actions(workspace_id,created_at desc);
create index office_workers_workspace on public.office_workers(workspace_id);
create index office_events_workspace on public.office_events(workspace_id,seq desc);
create index office_tasks_project on public.office_tasks(project_id,workspace_id);

alter table public.office_workspaces enable row level security;
alter table public.office_projects enable row level security;
alter table public.office_tasks enable row level security;
alter table public.office_actions enable row level security;
alter table public.office_events enable row level security;
alter table public.office_workers enable row level security;
create policy workspace_read on public.office_workspaces for select to authenticated using(owner_id=(select auth.uid()));
create policy project_read on public.office_projects for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
create policy task_read on public.office_tasks for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
create policy action_read on public.office_actions for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
create policy event_read on public.office_events for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
create policy worker_read on public.office_workers for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
revoke all on public.office_workspaces,public.office_projects,public.office_tasks,public.office_actions,public.office_events,public.office_workers from anon,authenticated;
grant select on public.office_workspaces,public.office_projects,public.office_tasks,public.office_actions,public.office_events,public.office_workers to authenticated;

create function app_private.emit(p_workspace uuid,p_kind text,p_payload jsonb) returns void
language plpgsql set search_path='' as $$
declare n bigint;
begin
 update public.office_workspaces set event_seq=event_seq+1 where id=p_workspace returning event_seq into n;
 insert into public.office_events(workspace_id,seq,kind,payload) values(p_workspace,n,p_kind,p_payload);
end $$;

create function app_private.snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.office_workspaces;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into w from public.office_workspaces where owner_id=auth.uid() for share;
 if w.id is null then return jsonb_build_object('workspace',null,'tasks','[]'::jsonb,'actions','[]'::jsonb,'projects','[]'::jsonb,'workers','[]'::jsonb,'events','[]'::jsonb); end if;
 return jsonb_build_object('workspace',to_jsonb(w),
 'projects',coalesce((select jsonb_agg(p order by created_at desc) from public.office_projects p where workspace_id=w.id),'[]'),
 'tasks',coalesce((select jsonb_agg(t order by created_at desc,step) from (select * from public.office_tasks where workspace_id=w.id order by created_at desc,step limit 250) t),'[]'),
 'actions',coalesce((select jsonb_agg(a order by created_at desc) from public.office_actions a where workspace_id=w.id),'[]'),
 'workers',coalesce((select jsonb_agg(r) from public.office_workers r where workspace_id=w.id),'[]'),
 'events',coalesce((select jsonb_agg(e order by seq desc) from (select * from public.office_events where workspace_id=w.id order by seq desc limit 60) e),'[]'));
end $$;

create function app_private.command(p_command text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.office_workspaces; current_email text; owner_email text; roles text[]; objective uuid; prev uuid; tid uuid; pid uuid; aid uuid; secret text; r text; i int:=0; a public.office_actions; wid uuid; queue text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select email into current_email from auth.users where id=auth.uid();
 select value into owner_email from app_private.settings where key='ceo_email';
 if owner_email is null or lower(current_email) is distinct from lower(owner_email) then raise exception 'This private office is restricted to its CEO'; end if;
 select * into w from public.office_workspaces where owner_id=auth.uid() for update;
 if p_command='bootstrap' and w.id is null then
  insert into public.office_workspaces(owner_id) values(auth.uid()) returning * into w;
  perform pgmq.create('office_'||replace(w.id::text,'-',''));
  perform app_private.emit(w.id,'office.created','{}');
 elsif w.id is null then raise exception 'Initialize your office first'; end if;
 queue:='office_'||replace(w.id::text,'-','');
 if p_command='bootstrap' then return to_jsonb(w);
 elsif p_command='project' then
  if coalesce(length(p_data->>'name'),0) not between 2 and 100 then raise exception 'Invalid project name'; end if;
  if coalesce(p_data->>'url','')<>'' and (p_data->>'url')!~* '^https?://' then raise exception 'Invalid website URL'; end if;
  if coalesce(p_data->>'repository','')<>'' and (p_data->>'repository')!~* '^https://github.com/' then raise exception 'Use a GitHub repository URL'; end if;
  insert into public.office_projects(workspace_id,name,url,repository) values(w.id,p_data->>'name',nullif(p_data->>'url',''),nullif(p_data->>'repository','')) returning id into pid;
  perform app_private.emit(w.id,'project.created',jsonb_build_object('project_id',pid)); return jsonb_build_object('id',pid);
 elsif p_command='objective' then
  if w.paused then raise exception 'Office is paused'; end if;
  if coalesce(length(p_data->>'title'),0) not between 8 and 1200 then raise exception 'Objective must be 8–1200 characters'; end if;
  if (select count(*) from public.office_tasks where workspace_id=w.id and status in('working','queued','blocked'))>=80 then raise exception 'Finish existing objectives before adding more'; end if;
  roles:=case p_data->>'template' when 'leads' then array['coo','leads','coo'] when 'development' then array['principal','frontend','backend','qa','principal'] when 'seo' then array['seo-principal','technical-seo','keywords','content','aeo-geo','schema','analytics','seo-qa'] when 'automation' then array['coo','automation','coo'] else null end;
  if roles is null then raise exception 'Unknown workflow'; end if;
  pid:=nullif(p_data->>'project_id','')::uuid;
  if pid is not null and not exists(select 1 from public.office_projects where id=pid and workspace_id=w.id) then raise exception 'Project not found'; end if;
  objective:=gen_random_uuid();
  foreach r in array roles loop
   insert into public.office_tasks(workspace_id,objective_id,project_id,title,template,agent_id,step,status,input,previous_task_id)
    values(w.id,objective,pid,p_data->>'title',p_data->>'template',r,i,case when i=0 then 'queued' else 'blocked' end,coalesce(p_data->'input','{}'),prev) returning id into tid;
   insert into app_private.jobs(task_id) values(tid);
   if i=0 then update app_private.jobs set message_id=(select pgmq.send(queue,jsonb_build_object('task_id',tid))) where task_id=tid; end if;
   prev:=tid; i:=i+1;
  end loop;
  perform app_private.emit(w.id,'objective.queued',jsonb_build_object('objective_id',objective,'title',p_data->>'title')); return jsonb_build_object('id',objective);
 elsif p_command='pair' then
  secret:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.office_workers(workspace_id,name) values(w.id,left(coalesce(p_data->>'name','My laptop'),100)) returning id into wid;
  insert into app_private.worker_credentials values(wid,encode(extensions.digest(secret,'sha256'),'hex'));
  perform app_private.emit(w.id,'worker.paired',jsonb_build_object('worker_id',wid)); return jsonb_build_object('worker_id',wid,'token',secret);
 elsif p_command='revoke_worker' then
  update public.office_workers set revoked=true where id=(p_data->>'id')::uuid and workspace_id=w.id;
  perform app_private.emit(w.id,'worker.revoked',jsonb_build_object('worker_id',p_data->>'id')); return '{}';
 elsif p_command='pause' then
  update public.office_workspaces set paused=coalesce((p_data->>'paused')::boolean,true) where id=w.id;
  perform app_private.emit(w.id,'office.pause',p_data); return '{}';
 elsif p_command='cancel' then
  update public.office_tasks set status='cancelled',updated_at=now() where objective_id=(p_data->>'id')::uuid and workspace_id=w.id and status in('blocked','queued','working');
  perform app_private.emit(w.id,'objective.cancelled',p_data); return '{}';
 elsif p_command in('approve','reject','revoke','dispatch','unknown','reconcile') then
  select * into a from public.office_actions where id=(p_data->>'id')::uuid and workspace_id=w.id for update;
  if a.id is null then raise exception 'Action not found'; end if;
  if a.snapshot_hash is distinct from p_data->>'hash' then raise exception 'Action changed. Reload before reviewing'; end if;
  if p_command='approve' and a.status='proposed' then
   update public.office_actions set status='approved',approved_by=auth.uid(),expires_at=now()+interval '24 hours',updated_at=now() where id=a.id;
  elsif p_command='reject' and a.status='proposed' then update public.office_actions set status='rejected',updated_at=now() where id=a.id;
  elsif p_command='revoke' and a.status='approved' then update public.office_actions set status='revoked',updated_at=now() where id=a.id;
  elsif p_command='dispatch' and a.status='approved' and a.expires_at>now() and not w.paused then
   update public.office_actions set status='dispatching',updated_at=now() where id=a.id;
  elsif p_command='unknown' and a.status in('dispatching','executing') then update public.office_actions set status='outcome_unknown',updated_at=now() where id=a.id;
  elsif p_command='reconcile' and a.status in('dispatching','executing','outcome_unknown') and length(p_data->>'provider_id') between 1 and 250 then
   update public.office_actions set status='succeeded',provider_id=p_data->>'provider_id',updated_at=now() where id=a.id;
  else raise exception 'This action cannot transition from its current state'; end if;
  perform app_private.emit(w.id,'action.'||p_command,jsonb_build_object('action_id',a.id));
  return to_jsonb(a);
 else raise exception 'Unknown command'; end if;
end $$;

create function app_private.worker(p_token text,p_operation text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare wr public.office_workers; w public.office_workspaces; t public.office_tasks; j app_private.jobs; msg record; aid uuid; nextid uuid; queue text; result_output jsonb;
begin
 select r.* into wr from public.office_workers r join app_private.worker_credentials c on c.worker_id=r.id
  where c.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and not r.revoked;
 if wr.id is null then raise exception 'Invalid or revoked worker'; end if;
 select * into w from public.office_workspaces where id=wr.workspace_id for update;
 queue:='office_'||replace(w.id::text,'-','');
 update public.office_workers set last_seen=now(),capabilities=case when p_operation='hello' then coalesce(p_data,'{}') else capabilities end where id=wr.id;
 if p_operation='hello' then return jsonb_build_object('workspace_id',w.id,'paused',w.paused);
 elsif p_operation='claim' then
  if w.paused then return 'null'; end if;
  select * into msg from pgmq.read(queue,120,1);
  if msg.msg_id is null then return 'null'; end if;
  select * into t from public.office_tasks where id=(msg.message->>'task_id')::uuid and workspace_id=w.id for update;
  select * into j from app_private.jobs where task_id=t.id for update;
  if t.status in('completed','cancelled','failed') or t.id is null then perform pgmq.archive(queue,msg.msg_id); return 'null'; end if;
  if j.lease_until>now() then perform pgmq.set_vt(queue,msg.msg_id,120); return 'null'; end if;
  if j.attempts>=3 then
   update public.office_tasks set status='failed',error='Worker interrupted repeatedly. Review before resubmitting.',updated_at=now() where id=t.id;
   perform pgmq.archive(queue,msg.msg_id); perform app_private.emit(w.id,'task.failed',jsonb_build_object('task_id',t.id)); return 'null';
  end if;
  aid:=gen_random_uuid();
  update app_private.jobs set worker_id=wr.id,attempt_id=aid,lease_until=now()+interval '120 seconds',attempts=attempts+1,message_id=msg.msg_id where task_id=t.id;
  update public.office_tasks set status='working',updated_at=now() where id=t.id;
  perform app_private.emit(w.id,'task.started',jsonb_build_object('task_id',t.id,'agent_id',t.agent_id));
  return jsonb_build_object('task',to_jsonb(t),'attempt_id',aid,'handoffs',coalesce((select jsonb_agg(jsonb_build_object('agent_id',agent_id,'output',output) order by step) from public.office_tasks where objective_id=t.objective_id and status='completed'),'[]'),'project',(select to_jsonb(p) from public.office_projects p where id=t.project_id));
 elsif p_operation in('heartbeat','complete','fail') then
  select * into t from public.office_tasks where id=(p_data->>'task_id')::uuid and workspace_id=w.id for update;
  select * into j from app_private.jobs where task_id=t.id for update;
  if t.status is distinct from 'working' or j.worker_id is distinct from wr.id or j.attempt_id is distinct from (p_data->>'attempt_id')::uuid or j.lease_until is null or j.lease_until<=now() then raise exception 'Lease lost or task cancelled'; end if;
  if p_operation='heartbeat' then
   if w.paused then raise exception 'Office paused'; end if;
   update app_private.jobs set lease_until=now()+interval '120 seconds' where task_id=t.id;
   perform pgmq.set_vt(queue,j.message_id,120); return '{}';
  elsif p_operation='complete' then
   result_output:=p_data->'output';
   if jsonb_typeof(result_output) is distinct from 'object' or coalesce(length(result_output->>'summary'),0) not between 1 and 2000 or coalesce(length(result_output->>'deliverable'),0) not between 1 and 50000 or jsonb_typeof(result_output->'limitations') is distinct from 'array' or jsonb_typeof(result_output->'sources') is distinct from 'array' then raise exception 'Invalid deliverable'; end if;
   update public.office_tasks set status='completed',output=result_output,error=null,updated_at=now() where id=t.id;
   if t.agent_id='leads' and result_output ? 'email' then
    if result_output->'email'->>'kind' is distinct from 'email' or result_output->'email'->>'account' is distinct from 'gmail' or t.input->>'recipient' is null or result_output->'email'->>'to' is distinct from t.input->>'recipient' or coalesce(length(result_output->'email'->>'body'),0) not between 1 and 12000 or coalesce(length(result_output->'email'->>'subject'),0) not between 1 and 200 then raise exception 'Invalid outreach proposal'; end if;
    insert into public.office_actions(workspace_id,task_id,snapshot,snapshot_hash) values(w.id,t.id,result_output->'email',encode(extensions.digest((result_output->'email')::text,'sha256'),'hex'));
   end if;
   select id into nextid from public.office_tasks where previous_task_id=t.id and workspace_id=w.id and status='blocked';
   if nextid is not null then
    update public.office_tasks set status='queued',updated_at=now() where id=nextid;
    update app_private.jobs set message_id=(select pgmq.send(queue,jsonb_build_object('task_id',nextid))) where task_id=nextid;
   end if;
  else
   update public.office_tasks set status='failed',error=left(coalesce(p_data->>'error','Execution failed'),2000),updated_at=now() where id=t.id;
  end if;
  perform pgmq.archive(queue,j.message_id);
  update app_private.jobs set lease_until=null where task_id=t.id;
  perform app_private.emit(w.id,case when p_operation='complete' then 'task.completed' else 'task.failed' end,jsonb_build_object('task_id',t.id,'agent_id',t.agent_id)); return '{}';
 else raise exception 'Unknown worker operation'; end if;
end $$;

-- Exposed functions are INVOKER wrappers; restricted DEFINER bodies are in app_private.
create function public.office_snapshot() returns jsonb language sql security invoker set search_path='' as $$select app_private.snapshot()$$;
create function public.office_command(p_command text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select app_private.command(p_command,p_data)$$;
create function public.office_worker(p_token text,p_operation text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select app_private.worker(p_token,p_operation,p_data)$$;
revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on function app_private.snapshot(),app_private.command(text,jsonb) to authenticated;
grant execute on function app_private.worker(text,text,jsonb) to anon;
revoke all on function public.office_snapshot(),public.office_command(text,jsonb),public.office_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.office_snapshot(),public.office_command(text,jsonb) to authenticated;
grant execute on function public.office_worker(text,text,jsonb) to anon;
-- No direct queue access from browser identities.
revoke all on schema pgmq from anon,authenticated;
alter publication supabase_realtime add table public.office_events;
