begin;
insert into auth.users(id,email) values ('ffe80000-0000-4000-8000-000000000001','lead@example.invalid'),('ffe80000-0000-4000-8000-000000000002','member@example.invalid');
insert into public.elan_oc_access values ('ffe80000-0000-4000-8000-000000000001','lead','A','lead'),('ffe80000-0000-4000-8000-000000000002','member','A','member');
insert into public.elan_oc_board(department,audience,kind,title,body) values('A','lead','briefing','lead only','demo'),('B','department','briefing','other dept','demo');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000001',true);
do $$begin
insert into public.elan_oc_board(department,audience,kind,title,body) values('A','department','briefing','Everyone in A','demo');
if (select count(*) from public.elan_oc_board)<>2 then raise exception 'lead visibility';end if;
begin insert into public.elan_oc_board(department,audience,kind,title,body) values('B','department','briefing','wrong','demo');raise exception 'scope breach';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000002',true);
do $$begin if (select count(*) from public.elan_oc_board)<>1 then raise exception 'member visibility';end if;
begin insert into public.elan_oc_board(department,audience,kind,title,body) values('A','department','briefing','wrong','demo');raise exception 'write breach';exception when insufficient_privilege then null;end;end $$;
reset role;set local role anon;
do $$begin begin perform 1 from public.elan_oc_board;raise exception 'anonymous access';exception when insufficient_privilege then null;end;end $$;
rollback;
select 'PASS: role and department scoped reads, lead publishing, member and anonymous denial; rolled back' as result;
