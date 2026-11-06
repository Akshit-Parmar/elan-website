begin;
-- Test identities are transaction-local; no email is sent.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000071','elan-appointment-test-a@example.invalid',null,'{}'),
('00000000-0000-4000-8000-000000000072','elan-appointment-test-b@example.invalid',now(),'{}');
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
select public.elan_save_direct_member(null,'Appointment Test','elan-appointment-test-a@example.invalid','','Social Media','Department lead','','lead',0);
reset role;
do $$begin
 if not exists(select 1 from public.elan_oc_pending_access where email='elan-appointment-test-a@example.invalid') then raise exception 'Missing pending appointment';end if;
 if exists(select 1 from public.elan_oc_access where user_id='00000000-0000-4000-8000-000000000071') then raise exception 'Unverified access granted';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
set local role authenticated;
do $$begin if public.elan_claim_appointment() then raise exception 'Unverified claim succeeded';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
set local role authenticated;
do $$begin
 if public.elan_claim_appointment() then raise exception 'Wrong email claimed appointment';end if;
 if exists(select 1 from public.elan_oc_pending_access) then raise exception 'Pending data exposed';end if;
 begin perform public.elan_save_direct_member(null,'Bad User','bad@example.invalid','','Finance','Head','','lead',0);raise exception 'Nonadmin appointment allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
end$$;
reset role;
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000071';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
set local role authenticated;
do $$begin
 if not public.elan_claim_appointment() then raise exception 'Verified claim failed';end if;
 if public.elan_claim_appointment() then raise exception 'Repeated claim not idempotent';end if;
 if not exists(select 1 from public.elan_oc_access where user_id=auth.uid() and role='lead' and department='Social Media') then raise exception 'Wrong department permission';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
select public.elan_save_direct_member(null,'Future Leader','elan-future-director@example.invalid','','Leadership','Director','','director',0);
do $$begin
 begin perform public.elan_save_direct_member(null,'Another Leader','elan-future-second@example.invalid','','Leadership','Director','','director',0);raise exception 'Duplicate seat reserved';exception when raise_exception then if sqlerrm<>'This leadership position already has a pending appointment.' then raise;end if;end;
end$$;
reset role;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('00000000-0000-4000-8000-000000000073','elan-future-director@example.invalid',now(),'{}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000073',true);
set local role authenticated;
do $$begin
 if not public.elan_claim_appointment() then raise exception 'Director claim failed';end if;
 if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid() and seat='director') then raise exception 'Director not activated';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.elan_staff where role='admin' limit 1),true);
set local role authenticated;
select public.elan_save_direct_member(null,'Assistant Test','elan-appointment-test-b@example.invalid','','Leadership','Assistant Director','','assistant',0);
reset role;
do $$begin
 if (select count(distinct user_id) from public.elan_oc_reviewers)<>2 then raise exception 'Leadership separation failed';end if;
end$$;
rollback;
select 'PASS: pending save, unverified and wrong-email denial, private pending records, nonadmin denial, verified activation, idempotency, reserved seats and distinct leadership accounts; all fixtures rolled back' as result;
