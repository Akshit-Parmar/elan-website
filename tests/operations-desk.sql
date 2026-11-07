begin;
insert into auth.users(id,email,email_confirmed_at) values
('f1230000-0000-4000-8000-000000000001','desk-head@example.invalid',now()),
('f1230000-0000-4000-8000-000000000002','desk-member@example.invalid',now()),
('f1230000-0000-4000-8000-000000000003','desk-other@example.invalid',now());
insert into public.elan_oc_access(user_id,label,department,role) values
('f1230000-0000-4000-8000-000000000001','desk-head@example.invalid','Social Media','lead'),
('f1230000-0000-4000-8000-000000000002','desk-member@example.invalid','Social Media','member'),
('f1230000-0000-4000-8000-000000000003','desk-other@example.invalid','Finance','member');
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_oc_reviewers where seat='assistant'),true);
set local role authenticated;
do $$begin
if jsonb_array_length(public.elan_ops_desk()->'teams')<2 then raise exception 'Missing leadership directory';end if;
perform public.elan_ops_brief('Social Media','Desk QA','Prepare launch copy');
perform public.elan_ops_assign('f1230000-0000-4000-8000-000000000003','Desk QA Finance','Reconcile receipts',current_date);
end$$;
select set_config('request.jwt.claim.sub','f1230000-0000-4000-8000-000000000001',true);
do $$begin
perform public.elan_ops_assign('f1230000-0000-4000-8000-000000000002','Desk QA Social','Prepare draft',current_date);
begin perform public.elan_ops_assign('f1230000-0000-4000-8000-000000000003','Bad','Other department',current_date);raise exception 'Cross-team write allowed';exception when raise_exception then if sqlerrm<>'Lead or leadership access required' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','f1230000-0000-4000-8000-000000000002',true);
do $$declare d jsonb:=public.elan_ops_desk();begin
if d->'finance'<>'[]' or (d->'tasks')::text like '%Desk QA Finance%' or (d->'tasks')::text not like '%Desk QA Social%' or (d->'posts')::text not like '%Prepare launch copy%' then raise exception 'Member scope failed';end if;
begin perform public.elan_ops_brief('Social Media','Bad','Text');raise exception 'Member published';exception when raise_exception then if sqlerrm<>'Leadership access required' then raise;end if;end;
end$$;
rollback;
select 'PASS: leadership overview, assignment and briefing; scoped head assignment; private member tasks and finance; no fixtures retained' as result;
