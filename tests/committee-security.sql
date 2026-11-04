begin;
insert into auth.users(id,email) values ('ffb60000-0000-4000-8000-000000000001','lead@example.invalid'),('ffb60000-0000-4000-8000-000000000002','member@example.invalid'),('ffb60000-0000-4000-8000-000000000003','other@example.invalid');
insert into public.elan_oc_access values ('ffb60000-0000-4000-8000-000000000001','Lead','Test A','lead'),('ffb60000-0000-4000-8000-000000000002','Member','Test A','member'),('ffb60000-0000-4000-8000-000000000003','Other','Test B','member');
insert into public.elan_oc_tasks(id,department,assigned_to,title) select user_id,department,user_id,label from public.elan_oc_access where department in ('Test A','Test B');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffb60000-0000-4000-8000-000000000002',true);
do $$declare n integer;begin
if (select count(*) from public.elan_oc_tasks)<>1 then raise exception 'Member scope failed';end if;
perform public.elan_oc_progress(auth.uid(),'In progress');
update public.elan_oc_tasks set department='Test B' where id=auth.uid();get diagnostics n=row_count;if n<>0 then raise exception 'Unauthorised reassignment';end if;
begin perform public.elan_oc_grant('member@example.invalid','Test A','lead');raise exception 'Self elevation accepted';exception when others then if sqlerrm<>'Administrator required' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','ffb60000-0000-4000-8000-000000000001',true);
do $$begin
if (select count(*) from public.elan_oc_tasks)<>2 then raise exception 'Lead scope failed';end if;
perform public.elan_oc_progress('ffb60000-0000-4000-8000-000000000002','Done');
begin perform public.elan_oc_progress('ffb60000-0000-4000-8000-000000000003','Done');raise exception 'Cross-department access';exception when others then if sqlerrm not like 'This responsibility%' then raise;end if;end;
end $$;
reset role;delete from public.elan_oc_access where user_id='ffb60000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin if exists(select 1 from public.elan_oc_tasks) then raise exception 'Revocation failed';end if;end $$;
reset role;set local role anon;
do $$begin if (select count(*) from public.elan_oc_roster where published)<3 then raise exception 'Public directory unavailable';end if;
begin perform 1 from public.elan_oc_tasks;raise exception 'Anonymous task access';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'Passed: member, lead, cross-department denial, revocation, anonymous isolation' as result;
