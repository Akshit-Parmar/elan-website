begin;
insert into auth.users(id,email,email_confirmed_at) values ('11111111-1111-4111-8111-111111111111','elan-test-a@example.invalid',now()),('22222222-2222-4222-8222-222222222222','elan-test-b@example.invalid',now());
insert into public.elan_editions(slug,title,status,published) values('test-edition','Test edition','upcoming',true);
insert into public.elan_registration_settings(edition_slug,registration_open,price_paise,capacity,min_age,max_age,terms_version,terms_text) values('test-edition',true,10000,2,14,20,'test-1','These are test-only participation terms.');
set local role service_role;
do $$ declare rid uuid; rid2 uuid; p public.elan_payments; ok boolean;begin
 rid=public.elan_create_registration('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test-edition','individual','Test School','Test A','1234567890','[{"full_name":"Student A","age":18,"grade":"12"}]','test-1',true);
 rid2=public.elan_create_registration('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','test-edition','individual','Test School','Test A','1234567890','[{"full_name":"Student A","age":18,"grade":"12"}]','test-1',true);
 if rid<>rid2 then raise exception 'FAIL duplicate registration';end if;
 begin
 perform public.elan_create_registration('22222222-2222-4222-8222-222222222222',gen_random_uuid(),'test-edition','individual','Test School','Test B','1234567890','[{"full_name":"Student B","age":13,"grade":"8"}]','test-1',true);
 raise exception 'FAIL accepted ineligible age';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin
 perform public.elan_create_registration('22222222-2222-4222-8222-222222222222',gen_random_uuid(),'test-edition','individual','Test School','Test B','1234567890','[{"full_name":"Student B","age":18,"grade":"12"}]','test-1',false);
 raise exception 'FAIL accepted missing consent';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin
 perform public.elan_create_registration('22222222-2222-4222-8222-222222222222',gen_random_uuid(),'test-edition','school','Test School','Test B','1234567890','[{"full_name":"Student B","age":18,"grade":"12"},{"full_name":"Student C","age":18,"grade":"12"}]','test-1',true);
 raise exception 'FAIL capacity overflow';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 p=public.elan_claim_order('11111111-1111-4111-8111-111111111111',rid);
 if not public.elan_lock_order(p.id,gen_random_uuid()) then raise exception 'FAIL initial order claim';end if;
 if public.elan_lock_order(p.id,gen_random_uuid()) then raise exception 'FAIL duplicate order claim';end if;
 begin perform public.elan_set_registration_status(rid,'cancelled');raise exception 'FAIL cancelled order';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 update public.elan_payments set order_id='order_test',status='created' where id=p.id;
 begin perform public.elan_capture_payment('order_test','pay_test',1,'INR');raise exception 'FAIL wrong amount';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 if not public.elan_capture_payment('order_test','pay_test',10000,'INR') then raise exception 'FAIL valid capture';end if;
 if not public.elan_capture_payment('order_test','pay_test',10000,'INR') then raise exception 'FAIL duplicate webhook';end if;
 if (select status from public.elan_registrations where id=rid)<>'confirmed' then raise exception 'FAIL not confirmed';end if;
 insert into public.elan_support(user_id,subject,message) values('11111111-1111-4111-8111-111111111111','Test support','This is a test support message.');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.elan_registrations where edition_slug='test-edition') then raise exception 'FAIL cross-account registration read';end if;
 if exists(select 1 from public.elan_support) then raise exception 'FAIL cross-account support read';end if;
 begin insert into public.elan_staff(user_id,role) values('22222222-2222-4222-8222-222222222222','admin');raise exception 'FAIL role escalation';exception when insufficient_privilege then null;end;
 begin perform public.elan_capture_payment('order_test','pay_attack',10000,'INR');raise exception 'FAIL browser called payment RPC';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin if (select count(*) from public.elan_registrations where edition_slug='test-edition')<>1 then raise exception 'FAIL owner cannot read own registration';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.elan_registrations;raise exception 'FAIL anonymous registration read';exception when insufficient_privilege then null;end;
 begin perform 1 from public.elan_enquiries;raise exception 'FAIL anonymous enquiry read';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: ownership, privilege escalation, age/consent/capacity, duplicate registration/order/webhook, payment amount and anonymous access tests; all fixtures rolled back' as result;
