begin;
select set_config('test.fin',(select id::text from public.elan_oc_modules where department='Finance'),true);
select set_config('test.j',gen_random_uuid()::text,true);
insert into auth.users(id,email) values ('ffa90000-0000-4000-8000-000000000001','cashier@example.invalid'),('ffa90000-0000-4000-8000-000000000002','outreach@example.invalid');
insert into public.elan_oc_access values ('ffa90000-0000-4000-8000-000000000001','Cashier','Finance','member'),('ffa90000-0000-4000-8000-000000000002','Outreach','School outreach','lead');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffa90000-0000-4000-8000-000000000001',true);
do $$declare m uuid:=current_setting('test.fin')::uuid; j uuid:=current_setting('test.j')::uuid; net numeric; begin
insert into public.elan_oc_journal(module_id,book_date,kind,amount,memo) values(m,'2001-01-01','opening',10000,'fixture'),(m,'2001-01-02','bill',1200,'fixture'),(m,'2001-01-03','settle',500,'fixture');
insert into public.elan_oc_journal(id,module_id,book_date,kind,amount,memo) values(j,m,'2001-01-04','receipt',2000,'fixture');
select debit-credit into strict net from public.elan_oc_accounts(m,'2001-01-04') where account='Funds';if net<>11500 then raise exception 'cash total';end if;
select credit-debit into strict net from public.elan_oc_accounts(m,'2001-01-04') where account='Bills payable';if net<>700 then raise exception 'liability total';end if;
if (select sum(debit-credit) from public.elan_oc_accounts(m,'2001-01-04'))<>0 then raise exception 'unbalanced journal';end if;
insert into storage.objects(bucket_id,name) values('elan-oc-bills',m||'/'||j||'/'||j||'.pdf');
if not exists(select 1 from storage.objects where bucket_id='elan-oc-bills') then raise exception 'missing receipt read';end if;
begin insert into public.elan_oc_journal(module_id,book_date,kind,amount,memo,reverses) values(m,'2001-01-04','receipt',2000,'fixture reverse',j);raise exception 'member reversed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','ffa90000-0000-4000-8000-000000000002',true);
do $$declare m uuid:=current_setting('test.fin')::uuid; j uuid:=current_setting('test.j')::uuid;begin
if exists(select 1 from storage.objects where bucket_id='elan-oc-bills') or exists(select 1 from public.elan_oc_journal) or exists(select 1 from public.elan_oc_accounts(m,current_date)) then raise exception 'finance exposure';end if;
begin insert into storage.objects(bucket_id,name) values('elan-oc-bills',m||'/'||j||'/'||gen_random_uuid()||'.pdf');raise exception 'unscoped upload';exception when insufficient_privilege then null;end;
insert into public.elan_oc_records(module_id,title,details) select id,'Test school','{"stage":"Contacted"}' from public.elan_oc_modules where department='School outreach';
end $$;
reset role;update public.elan_oc_access set role='lead' where label='Cashier' and user_id='ffa90000-0000-4000-8000-000000000001';
set local role authenticated;select set_config('request.jwt.claim.sub','ffa90000-0000-4000-8000-000000000001',true);
do $$declare m uuid:=current_setting('test.fin')::uuid;begin
if exists(select 1 from public.elan_oc_records where title='Test school') then raise exception 'operational data leak';end if;
insert into public.elan_oc_journal(module_id,book_date,kind,amount,memo,reverses) values(m,'2001-01-05','receipt',2000,'fixture reversal',current_setting('test.j')::uuid);
if (select debit-credit from public.elan_oc_accounts(m,'2001-01-05') where account='Funds')<>9500 then raise exception 'reversal result';end if;end $$;
rollback;select 'PASS: finance statement totals and cutoff, reversal, bank/expense separation, scoped storage metadata and department register access; rolled back' as result;
