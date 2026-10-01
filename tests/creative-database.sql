-- Creative workflow fixtures leave no records or authentication identities behind.
begin;
do $$
declare u uuid:=gen_random_uuid(); w uuid; objective uuid; workflow text; actual text[]; expected text[];
begin
 insert into auth.users(id,email) values(u,'creative-fixture@example.invalid');
 update app_private.settings set value='creative-fixture@example.invalid' where key='ceo_email';
 perform set_config('request.jwt.claim.sub',u::text,true);
 w:=(public.office_command('bootstrap','{}')->>'id')::uuid;
 foreach workflow in array array['video','design','social'] loop
  objective:=(public.office_command('objective',jsonb_build_object('title','Prepare a creative review brief','template',workflow,'input','{}'::jsonb))->>'id')::uuid;
  select array_agg(agent_id order by step) into actual from public.office_tasks where objective_id=objective and workspace_id=w;
  expected:=case workflow when 'video' then array['coo','video','designer','video','coo'] when 'design' then array['coo','designer','coo'] else array['coo','social','designer','video','social','coo'] end;
  assert actual=expected,'Creative workflow role order must match contracts';
  assert (select count(*)=1 from public.office_tasks where objective_id=objective and status='queued'),'Only the first handoff is queued';
 end loop;
end $$;
rollback;
