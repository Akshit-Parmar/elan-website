begin;
insert into auth.users(id,email,email_confirmed_at) values
('ffe90000-0000-4000-8000-000000000001','people-admin@example.invalid',now()),
('ffe90000-0000-4000-8000-000000000002','people-member@example.invalid',now()),
('ffe90000-0000-4000-8000-000000000003','people-unused@example.invalid',now());
insert into public.elan_staff(user_id,role) values('ffe90000-0000-4000-8000-000000000001','admin');
insert into public.elan_enquiries(id,kind,full_name,email,details) values
('ffe90000-0000-4000-8000-000000000004','volunteer','Fixture Applicant','people-member@example.invalid','{"application_version":"2"}'),
('ffe90000-0000-4000-8000-000000000005','contact','Fixture Contact','people-member@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe90000-0000-4000-8000-000000000001',true);
do $$declare r public.elan_oc_members_2027;j jsonb;begin
j:=public.elan_accounts('people-unused@example.invalid',0);if (j->>'total')::int<>1 then raise exception 'Account search failed';end if;
j:=public.elan_account_removal_check('ffe90000-0000-4000-8000-000000000003');if j->'blockers'<>'[]'::jsonb then raise exception 'Unused account wrongly blocked';end if;
begin perform public.elan_account_removal_check('ffe90000-0000-4000-8000-000000000001');raise exception 'Self deletion allowed';exception when raise_exception then if sqlerrm<>'You cannot delete your own account here' then raise;end if;end;
r:=public.elan_save_direct_member(null,'Fixture Member','people-member@example.invalid','','Design','Member','','record_only',0);
if exists(select 1 from public.elan_oc_access where user_id='ffe90000-0000-4000-8000-000000000002') then raise exception 'Record unexpectedly granted access';end if;
r:=public.elan_save_direct_member(r.id,'Fixture Member','people-member@example.invalid','','Design','Member','','member',1);
if not exists(select 1 from public.elan_oc_access where user_id='ffe90000-0000-4000-8000-000000000002' and department='Design' and role='member') then raise exception 'Explicit grant failed';end if;
begin perform public.elan_save_direct_member(r.id,'Fixture','people-member@example.invalid','','Design','Member','','record_only',1);raise exception 'Stale save allowed';exception when raise_exception then if sqlerrm<>'Member changed. Reload before saving' then raise;end if;end;
begin perform public.elan_save_direct_member(null,'No Login','people-missing@example.invalid','','Design','Member','','lead',0);raise exception 'Missing account grant allowed';exception when raise_exception then if sqlerrm<>'Ask the organiser to create and verify their account first.' then raise;end if;end;
if exists(select 1 from public.elan_oc_members_2027 where email='people-missing@example.invalid') then raise exception 'Failed access grant partially saved';end if;
r:=public.elan_save_direct_member(null,'No Login','people-missing@example.invalid','','Design','Member','','record_only',0);
begin perform public.elan_delete_application('ffe90000-0000-4000-8000-000000000005','people-member@example.invalid',0);raise exception 'Non application deleted';exception when raise_exception then if sqlerrm<>'OC application not found' then raise;end if;end;
begin perform public.elan_delete_application('ffe90000-0000-4000-8000-000000000004','wrong@example.invalid',0);raise exception 'Wrong email accepted';exception when raise_exception then if sqlerrm<>'Type the applicant email exactly to confirm' then raise;end if;end;
end$$;
select public.elan_save_application_review('ffe90000-0000-4000-8000-000000000004','under_review','test',null,'',0,'',false,'');
do $$begin
begin perform public.elan_delete_application('ffe90000-0000-4000-8000-000000000004','people-member@example.invalid',0);raise exception 'Stale delete accepted';exception when raise_exception then if sqlerrm<>'Application changed. Reload before deleting' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','ffe90000-0000-4000-8000-000000000002',true);
do $$begin
if exists(select 1 from public.elan_oc_members_2027) then raise exception 'Member register leaked';end if;
begin perform public.elan_accounts('',0);raise exception 'Nonadmin account list allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
begin perform public.elan_delete_application('ffe90000-0000-4000-8000-000000000004','people-member@example.invalid',1);raise exception 'Nonadmin delete allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
begin perform public.elan_save_direct_member(null,'Bad','bad@example.invalid','','Design','Member','','lead',0);raise exception 'Nonadmin grant allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
end$$;
reset role;
insert into public.elan_oc_tasks(assigned_to,department,title) values('ffe90000-0000-4000-8000-000000000002','Design','Fixture Task');
update public.elan_acknowledgements set status='sending' where enquiry_id='ffe90000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','ffe90000-0000-4000-8000-000000000001',true);
do $$declare j jsonb;begin
j:=public.elan_account_removal_check('ffe90000-0000-4000-8000-000000000002');if jsonb_array_length(j->'blockers')=0 then raise exception 'Linked task not protected';end if;
begin perform public.elan_delete_application('ffe90000-0000-4000-8000-000000000004','people-member@example.invalid',1);raise exception 'In-flight email delete allowed';exception when raise_exception then if sqlerrm<>'An acknowledgement is still sending. Resolve its delivery state before deleting' then raise;end if;end;
end$$;
reset role;update public.elan_acknowledgements set status='pending' where enquiry_id='ffe90000-0000-4000-8000-000000000004';
set local role authenticated;
select public.elan_delete_application('ffe90000-0000-4000-8000-000000000004','people-member@example.invalid',1);
reset role;
do $$begin
if exists(select 1 from public.elan_enquiries where id='ffe90000-0000-4000-8000-000000000004') or exists(select 1 from public.elan_oc_recruitment_history where enquiry_id='ffe90000-0000-4000-8000-000000000004') or exists(select 1 from public.elan_acknowledgements where enquiry_id='ffe90000-0000-4000-8000-000000000004') then raise exception 'Application children remain';end if;
if not exists(select 1 from public.elan_oc_access where user_id='ffe90000-0000-4000-8000-000000000002') then raise exception 'Application deletion removed access';end if;
if not exists(select 1 from auth.users where id='ffe90000-0000-4000-8000-000000000002') then raise exception 'Application deletion removed account';end if;
end$$;
set local role anon;
do $$begin begin perform public.elan_accounts('',0);raise exception 'Anonymous account listing allowed';exception when insufficient_privilege then null;end;end$$;
rollback;
select 'PASS: account lookup, protected records, admin-only access, no implicit access grants, atomic direct appointments, stale-write rejection, typed application deletion, linked review cleanup and account/access preservation. Fixtures rolled back.' as result;
