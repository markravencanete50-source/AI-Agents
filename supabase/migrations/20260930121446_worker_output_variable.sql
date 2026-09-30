create or replace function app_private.worker(p_token text,p_operation text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
