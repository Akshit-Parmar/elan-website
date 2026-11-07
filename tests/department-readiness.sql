begin;
do $test$
declare
 uid uuid:=gen_random_uuid();director_id uuid;assistant_id uuid;mod record;perm text;rid uuid;f text;p jsonb;kind text;recv text;ctx jsonb;targetid uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(uid,uid::text||'@example.invalid',now());
 select user_id into director_id from public.elan_oc_reviewers where seat='director';
 if director_id is null then director_id:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at) values(director_id,director_id::text||'@example.invalid',now());insert into public.elan_oc_reviewers values('director',director_id,'QA fixture');end if;
 select user_id into assistant_id from public.elan_oc_reviewers where seat='assistant';
 if assistant_id is null then assistant_id:=gen_random_uuid();insert into auth.users(id,email,email_confirmed_at) values(assistant_id,assistant_id::text||'@example.invalid',now());insert into public.elan_oc_reviewers values('assistant',assistant_id,'QA fixture');end if;
 for mod in select * from public.elan_oc_modules order by department loop
 foreach perm in array array['member','lead'] loop
  insert into public.elan_oc_access values(uid,'QA organiser',mod.department,perm) on conflict(user_id) do update set department=excluded.department,role=excluded.role;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  ctx:=public.elan_desk_context();
  if not ((ctx->'departments') ? 'Documentation') then raise exception 'No Documentation handoff';end if;
  if (ctx->'coordination'<>'null'::jsonb) is distinct from (mod.department in ('Heads of All Departments','Chief Advisor')) then raise exception 'Coordination scope failed: %',mod.department;end if;
  rid:=gen_random_uuid();f:='';
  if mod.tool='finance' then
   kind:='journal';p:=jsonb_build_object('kind','spend','book_date',current_date,'memo','QA proof','amount',17,'method','Cash');f:=uid::text||'/'||rid::text||'/proof.jpg';
   insert into storage.objects(bucket_id,name) values('elan-oc-review-files',f);
  else kind:='record';p:='{"title":"QA team entry","details":{"stage":"Draft"}}'::jsonb;
   if mod.tool='partnerships' then p:=p||'{"handoffs":[{"department":"Documentation","brief":"Prepare the partner report"}]}'::jsonb;end if;
  end if;
  execute 'set local role authenticated';
  perform public.elan_review_submit(rid,kind,p,f);
  perform set_config('request.jwt.claim.sub',director_id::text,true);
  if public.elan_review_decide(rid,'approve','QA')<>'pending' then raise exception 'Posted after one vote';end if;
  perform set_config('request.jwt.claim.sub',assistant_id::text,true);
  if public.elan_review_decide(rid,'approve','QA')<>'approved' then raise exception 'Approval missing';end if;
  execute 'reset role';
  if not exists(select 1 from public.elan_oc_journal where id=rid) and not exists(select 1 from public.elan_oc_records where id=rid) then raise exception 'Missing posted work for %',mod.department;end if;
  if mod.tool='partnerships' and not exists(select 1 from public.elan_oc_handoffs where source_id=rid and department='Documentation') then raise exception 'Handoff missing';end if;
 end loop;
 end loop;
end $test$;
rollback;
select 'PASS: each configured department as member and head, context privacy, submission, first vote pending, second vote posts; sponsorship handoff; all fixtures rolled back' as result;
