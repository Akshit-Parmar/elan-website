begin;
insert into auth.users(id,email,email_confirmed_at) values ('ffe80000-0000-4000-8000-000000000001','journey-admin@example.invalid',now()),('ffe80000-0000-4000-8000-000000000002','journey-applicant@example.invalid',now()),('ffe80000-0000-4000-8000-000000000004','journey-other@example.invalid',now());
insert into public.elan_staff(user_id,role) values('ffe80000-0000-4000-8000-000000000001','admin');
insert into public.elan_enquiries(id,kind,full_name,email,details) values('ffe80000-0000-4000-8000-000000000003','volunteer','Test Applicant','journey-applicant@example.invalid','{"application_version":"2","department":"Design","study_year":"Year 1"}');

set local role service_role;
do $$begin if public.elan_application_account('ffe80000-0000-4000-8000-000000000003')<>'verified' then raise exception 'Wrong mail path';end if;end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000004',true);
do $$begin if public.elan_applicant_profile() is not null then raise exception 'Profile leaked';end if;
begin perform public.elan_select_applicant('ffe80000-0000-4000-8000-000000000003','Finance','',0,'');raise exception 'Non-admin selected';exception when raise_exception then if sqlerrm<>'Administrator required' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000001',true);
select public.elan_select_applicant('ffe80000-0000-4000-8000-000000000003','Finance','Private note',0,'Welcome');
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000002',true);
do $$begin if public.elan_applicant_profile()->>'year' is distinct from 'Year 1' or public.elan_my_applications()->0->>'stage' is distinct from 'selected' or not exists(select 1 from public.elan_oc_access where user_id=auth.uid() and department='Finance' and role='member') then raise exception 'Approved journey failed';end if;end$$;
rollback;
select 'PASS: verified mail, private applicant profile, non-admin denial, selection and Finance member access; rolled back' as result;
