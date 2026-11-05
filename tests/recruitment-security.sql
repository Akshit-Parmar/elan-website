begin;
insert into auth.users(id,email) values ('ffe90000-0000-4000-8000-000000000001','recruitment-admin@example.invalid'),('ffe90000-0000-4000-8000-000000000002','recruitment-member@example.invalid');
insert into public.elan_staff(user_id,role) values('ffe90000-0000-4000-8000-000000000001','admin');
insert into public.elan_enquiries(id,kind,full_name,email,details) values('ffe90000-0000-4000-8000-000000000003','volunteer','Test Applicant','applicant@example.invalid','{"intent":"2027 organising committee application","department":"Finance","study_year":"Grade 12"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe90000-0000-4000-8000-000000000001',true);
do $$declare r public.elan_oc_recruitment;begin
r:=public.elan_save_recruitment('ffe90000-0000-4000-8000-000000000003','shortlisted','Private note',null,'',0);
if r.stage<>'shortlisted' or r.version<>1 then raise exception 'Save failed';end if;
r:=public.elan_save_recruitment(r.enquiry_id,'interview','Interview planned','2027-01-10 10:00+05:30','Online',1);
if r.interview_at is null or r.version<>2 then raise exception 'Interview not saved';end if;
begin perform public.elan_save_recruitment(r.enquiry_id,'selected','',null,'',1);raise exception 'Stale write permitted';exception when raise_exception then if sqlerrm='Stale write permitted' then raise;end if;end;
if (select count(*) from public.elan_oc_recruitment_history where enquiry_id=r.enquiry_id)<>2 then raise exception 'Missing history';end if;
if exists(select 1 from public.elan_oc_access where user_id='ffe90000-0000-4000-8000-000000000002') then raise exception 'Unexpected access';end if;
perform public.elan_oc_summary();
end$$;
select set_config('request.jwt.claim.sub','ffe90000-0000-4000-8000-000000000002',true);
do $$begin
if exists(select 1 from public.elan_oc_recruitment) or exists(select 1 from public.elan_oc_recruitment_history) then raise exception 'Private data visible';end if;
begin perform public.elan_save_recruitment('ffe90000-0000-4000-8000-000000000003','selected','',null,'',2);raise exception 'Write allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
begin perform public.elan_oc_summary();raise exception 'Summary allowed';exception when raise_exception then if sqlerrm<>'Leadership or administrator access required' then raise;end if;end;
end$$;
reset role;set local role anon;
do $$begin begin perform 1 from public.elan_oc_recruitment;raise exception 'Anonymous access';exception when insufficient_privilege then null;end;end$$;
rollback;
select 'PASS: review save, interview, concurrency, history, access separation, non-admin and anonymous denial; all fixtures rolled back' as result;
