-- A scoped executor can claim one previously approved dispatch, never create or approve actions.
create table app_private.executors(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.office_workspaces(id),token_hash text unique not null,revoked boolean not null default false);
alter table public.office_actions drop constraint office_actions_status_check;
alter table public.office_actions add constraint office_actions_status_check check(status in('proposed','approved','rejected','revoked','dispatching','executing','succeeded','outcome_unknown'));
create function app_private.pair_executor() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid; secret text; eid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select id into w from public.office_workspaces where owner_id=auth.uid() for update;
 if w is null then raise exception 'Initialize your CEO office first'; end if;
 update app_private.executors set revoked=true where workspace_id=w;
 secret:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.executors(workspace_id,token_hash) values(w,encode(extensions.digest(secret,'sha256'),'hex')) returning id into eid;
 perform app_private.emit(w,'executor.paired',jsonb_build_object('executor_id',eid));
 return jsonb_build_object('token',secret);
end $$;
create function app_private.executor(p_token text,p_operation text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.office_workspaces; e app_private.executors; a public.office_actions;
begin
 select * into e from app_private.executors where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and not revoked;
 if e.id is null then raise exception 'Invalid executor'; end if;
 select * into w from public.office_workspaces where id=e.workspace_id for update;
 select * into a from public.office_actions where id=(p_data->>'id')::uuid and workspace_id=w.id for update;
 if a.id is null or a.snapshot_hash is distinct from p_data->>'hash' then raise exception 'Action snapshot mismatch'; end if;
 if p_operation='claim' then
  if w.paused or a.status<>'dispatching' or a.expires_at is null or a.expires_at<=now() then raise exception 'Action is unavailable'; end if;
  update public.office_actions set status='executing',updated_at=now() where id=a.id;
  perform app_private.emit(w.id,'action.executing',jsonb_build_object('action_id',a.id));
  return jsonb_build_object('id',a.id,'hash',a.snapshot_hash,'snapshot',a.snapshot);
 elsif p_operation='complete' then
  if a.status not in('executing','outcome_unknown') or coalesce(length(p_data->>'provider_id'),0) not between 1 and 250 then raise exception 'Invalid provider result'; end if;
  update public.office_actions set status='succeeded',provider_id=p_data->>'provider_id',updated_at=now() where id=a.id;
  perform app_private.emit(w.id,'action.succeeded',jsonb_build_object('action_id',a.id));return '{}';
 else raise exception 'Unknown executor operation'; end if;
end $$;
create function public.office_pair_executor() returns jsonb language sql security invoker set search_path='' as $$select app_private.pair_executor()$$;
create function public.office_executor(p_token text,p_operation text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.executor(p_token,p_operation,p_data)$$;
revoke all on function app_private.pair_executor(),app_private.executor(text,text,jsonb),public.office_pair_executor(),public.office_executor(text,text,jsonb) from public,anon,authenticated;
grant execute on function app_private.pair_executor(),public.office_pair_executor() to authenticated;
grant execute on function app_private.executor(text,text,jsonb),public.office_executor(text,text,jsonb) to anon;

create table public.office_media(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.office_workspaces(id),public_id text not null,resource_type text not null check(resource_type in('image','video')),format text,bytes bigint,width int,height int,created_at timestamptz not null default now(),unique(workspace_id,public_id));
create index office_media_workspace on public.office_media(workspace_id);
alter table public.office_media enable row level security;
create policy media_read on public.office_media for select to authenticated using(workspace_id in(select id from public.office_workspaces where owner_id=(select auth.uid())));
revoke all on public.office_media from anon,authenticated;
grant select on public.office_media to authenticated;
create function app_private.record_media(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid; mid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select id into w from public.office_workspaces where owner_id=auth.uid() for update;
 if w is null or left(p_data->>'public_id',length('office/'||w::text||'/')) is distinct from 'office/'||w::text||'/' then raise exception 'Media scope mismatch'; end if;
 insert into public.office_media(workspace_id,public_id,resource_type,format,bytes,width,height) values(w,p_data->>'public_id',p_data->>'resource_type',p_data->>'format',(p_data->>'bytes')::bigint,(p_data->>'width')::int,(p_data->>'height')::int)
 on conflict(workspace_id,public_id) do update set bytes=excluded.bytes returning id into mid;
 perform app_private.emit(w,'media.recorded',jsonb_build_object('media_id',mid));return jsonb_build_object('id',mid);
end $$;
create function public.office_record_media(p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.record_media(p_data)$$;
revoke all on function app_private.record_media(jsonb),public.office_record_media(jsonb) from public,anon,authenticated;
grant execute on function app_private.record_media(jsonb),public.office_record_media(jsonb) to authenticated;
create or replace function app_private.command(p_command text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
