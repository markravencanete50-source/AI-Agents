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
