begin;
insert into auth.users(id,email,email_confirmed_at) values ('ffe80000-0000-4000-8000-000000000001','journey-admin@example.invalid',now()),('ffe80000-0000-4000-8000-000000000002','journey-applicant@example.invalid',now()),('ffe80000-0000-4000-8000-000000000004','journey-other@example.invalid',now());
insert into public.elan_staff(user_id,role) values('ffe80000-0000-4000-8000-000000000001','admin');
insert into public.elan_enquiries(id,kind,full_name,email,details) values('ffe80000-0000-4000-8000-000000000003','volunteer','Test Applicant','journey-applicant@example.invalid','{"application_version":"2","department":"Design","study_year":"Year 1"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000001',true);
select public.elan_save_application_review('ffe80000-0000-4000-8000-000000000003','interview','SECRET REVIEW',now()+interval '7 days','SECRET INTERVIEW',0,'Please prepare your portfolio',false,'Meet online');
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000002',true);
do $$declare j jsonb;begin
j:=public.elan_my_applications();if jsonb_array_length(j)<>1 or j::text like '%SECRET%' or j->0->>'interview_at' is not null or j->0->>'instructions'<>'' then raise exception 'Private interview leaked';end if;
if exists(select 1 from public.elan_oc_recruitment) or exists(select 1 from public.elan_acknowledgements) then raise exception 'Raw data exposed';end if;
begin perform public.elan_interview_reply('ffe80000-0000-4000-8000-000000000003','confirmed','',1);raise exception 'Unpublished response accepted';exception when raise_exception then if sqlerrm='Unpublished response accepted' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000001',true);
select public.elan_save_application_review('ffe80000-0000-4000-8000-000000000003','interview','SECRET REVIEW',now()+interval '7 days','SECRET INTERVIEW',1,'Please prepare your portfolio',true,'Meet online');
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000002',true);
do $$declare j jsonb;begin
j:=public.elan_my_applications();if j->0->>'instructions'<>'Meet online' or j->0->>'interview_at' is null then raise exception 'Published interview missing';end if;
perform public.elan_interview_reply('ffe80000-0000-4000-8000-000000000003','reschedule','Available after 4pm IST',2);
begin perform public.elan_interview_reply('ffe80000-0000-4000-8000-000000000003','confirmed','',2);raise exception 'Stale response accepted';exception when raise_exception then if sqlerrm='Stale response accepted' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','ffe80000-0000-4000-8000-000000000004',true);
do $$begin
if public.elan_my_applications()<>'[]'::jsonb then raise exception 'Another applicant visible';end if;
begin perform public.elan_interview_reply('ffe80000-0000-4000-8000-000000000003','confirmed','',3);raise exception 'Other user response accepted';exception when raise_exception then if sqlerrm<>'Application not found' then raise;end if;end;
begin perform public.elan_save_application_review('ffe80000-0000-4000-8000-000000000003','selected','',null,'',3,'',false,'');raise exception 'Other user review accepted';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
end$$;
reset role;set local role anon;
do $$begin begin perform public.elan_my_applications();raise exception 'Anonymous tracking allowed';exception when insufficient_privilege then null;end;end$$;
rollback;
select 'PASS: verified email ownership, private notes, published invitation, response, concurrency, cross-user denial, admin-only review, anon denial. Fixtures rolled back.' as result;
