-- Approved posting and totals are exercised by dual-approval.sql and organiser-rehearsal.sql.
-- This regression ensures the old direct-posting path stays closed.
begin;
insert into auth.users(id,email) values ('ffa90000-0000-4000-8000-000000000001','cashier@example.invalid');
insert into public.elan_oc_access values ('ffa90000-0000-4000-8000-000000000001','Cashier','Finance','lead');
set local role authenticated;
select set_config('request.jwt.claim.sub','ffa90000-0000-4000-8000-000000000001',true);
do $$declare m uuid;begin
select id into strict m from public.elan_oc_modules where department='Finance';
begin insert into public.elan_oc_journal(module_id,book_date,kind,amount,memo) values(m,current_date,'receipt',100,'Test direct posting');raise exception 'Direct posting allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: finance lead cannot post funds directly; approval workflow required; rolled back' as result;
