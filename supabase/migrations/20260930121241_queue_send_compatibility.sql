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
  elsif p_command='unknown' and a.status='dispatching' then update public.office_actions set status='outcome_unknown',updated_at=now() where id=a.id;
  elsif p_command='reconcile' and a.status in('dispatching','outcome_unknown') and length(p_data->>'provider_id') between 1 and 250 then
   update public.office_actions set status='succeeded',provider_id=p_data->>'provider_id',updated_at=now() where id=a.id;
  else raise exception 'This action cannot transition from its current state'; end if;
  perform app_private.emit(w.id,'action.'||p_command,jsonb_build_object('action_id',a.id));
  return to_jsonb(a);
 else raise exception 'Unknown command'; end if;
end $$;

create or replace function app_private.worker(p_token text,p_operation text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare wr public.office_workers; w public.office_workspaces; t public.office_tasks; j app_private.jobs; msg record; aid uuid; nextid uuid; queue text; output jsonb;
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
   output:=p_data->'output';
   if jsonb_typeof(output) is distinct from 'object' or coalesce(length(output->>'summary'),0) not between 1 and 2000 or coalesce(length(output->>'deliverable'),0) not between 1 and 50000 or jsonb_typeof(output->'limitations') is distinct from 'array' or jsonb_typeof(output->'sources') is distinct from 'array' then raise exception 'Invalid deliverable'; end if;
   update public.office_tasks set status='completed',output=output,error=null,updated_at=now() where id=t.id;
   if t.agent_id='leads' and output ? 'email' then
    if output->'email'->>'kind' is distinct from 'email' or output->'email'->>'account' is distinct from 'gmail' or t.input->>'recipient' is null or output->'email'->>'to' is distinct from t.input->>'recipient' or coalesce(length(output->'email'->>'body'),0) not between 1 and 12000 or coalesce(length(output->'email'->>'subject'),0) not between 1 and 200 then raise exception 'Invalid outreach proposal'; end if;
    insert into public.office_actions(workspace_id,task_id,snapshot,snapshot_hash) values(w.id,t.id,output->'email',encode(extensions.digest((output->'email')::text,'sha256'),'hex'));
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
