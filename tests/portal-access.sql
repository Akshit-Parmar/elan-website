begin;
insert into auth.users(id,email,email_confirmed_at,created_at)
select ('aa910000-0000-4000-8000-00000000000'||n)::uuid,'portal-qa-'||n||'@example.invalid',now(),now()-interval '1 day' from generate_series(1,4)n;
insert into public.elan_staff values('aa910000-0000-4000-8000-000000000001','admin',now());
insert into public.elan_oc_access values('aa910000-0000-4000-8000-000000000001','portal-qa-1@example.invalid','Social Media','lead'),('aa910000-0000-4000-8000-000000000002','portal-qa-2@example.invalid','Social Media','member');
insert into public.elan_enquiries(kind,full_name,email,details,created_at) values('volunteer','QA Applicant','portal-qa-4@example.invalid','{"application_version":2}',now()-interval '2 days'),('volunteer','Unconfirmed later application','portal-qa-3@example.invalid','{"application_version":2}',now());
insert into public.elan_profiles(user_id,full_name) values ('aa910000-0000-4000-8000-000000000002','QA') on conflict(user_id) do nothing;
set local role authenticated;
do $$declare n int;v text;begin
 for n in 1..4 loop
 perform set_config('request.jwt.claim.sub','aa910000-0000-4000-8000-00000000000'||n,true);
 v:=public.elan_login_portal();
 if v is distinct from (array['admin','organiser','participant','applicant'])[n] then raise exception 'Unexpected portal: %',v;end if;
 if v='organiser' then
 perform public.elan_ops_desk();
 if exists(select 1 from public.elan_profiles where user_id=auth.uid()) then raise exception 'Participant profile leaked';end if;
 else begin perform public.elan_ops_desk();raise exception 'Wrong portal read organiser workspace';exception when insufficient_privilege then null;end;end if;
 if v='applicant' then perform public.elan_my_applications();else begin perform public.elan_my_applications();raise exception 'Wrong portal read applicant data';exception when insufficient_privilege then null;end;end if;
 end loop;
 perform set_config('request.jwt.claim.sub','aa910000-0000-4000-8000-000000000003',true);
 perform public.elan_join_applicant_login();
 if public.elan_login_portal()<>'applicant' then raise exception 'Verified applicant transition failed';end if;
end$$;
rollback;
select 'PASS: exclusive admin (even with an OC assignment), organiser, participant and applicant; wrong RPC denied, organiser profile blocked, participant retained on untrusted application; rollback' as result;
