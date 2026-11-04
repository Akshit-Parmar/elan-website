create table public.elan_oc_modules(id uuid primary key default gen_random_uuid(),department text unique not null check(length(trim(department)) between 1 and 90),tool text not null check(tool in ('finance','outreach','operations','programme','media','partnerships','general')));
alter table public.elan_oc_modules enable row level security;
revoke all on public.elan_oc_modules from public,anon,authenticated;
grant select,insert on public.elan_oc_modules to authenticated;
create policy modules_admin on public.elan_oc_modules for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy modules_own on public.elan_oc_modules for select to authenticated using(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_modules.department));
insert into public.elan_oc_modules(department,tool) values ('Finance','finance'),('School outreach','outreach'),('Operations & hospitality','operations'),('Programme & Crisis Command','programme'),('Design & media','media'),('Partnerships','partnerships');
create function elan_private.oc_tool_ok(p_id uuid,p_finance boolean,p_lead boolean default false) returns boolean language sql stable security invoker set search_path='' as $$
select exists(select 1 from public.elan_oc_modules m join public.elan_oc_access a on a.department=m.department where m.id=p_id and (m.tool='finance')=p_finance and a.user_id=(select auth.uid()) and (not p_lead or a.role='lead'))$$;
revoke all on function elan_private.oc_tool_ok(uuid,boolean,boolean) from public,anon;
grant execute on function elan_private.oc_tool_ok(uuid,boolean,boolean) to authenticated;
create table public.elan_oc_records(id uuid primary key default gen_random_uuid(),module_id uuid not null references public.elan_oc_modules, title text not null check(length(trim(title)) between 1 and 180), details jsonb not null check(jsonb_typeof(details)='object' and octet_length(details::text)<12000), created_by uuid not null default auth.uid(),updated_at timestamptz not null default clock_timestamp());
alter table public.elan_oc_records enable row level security;
revoke all on public.elan_oc_records from public,anon,authenticated;
grant select,insert(module_id,title,details),update(title,details) on public.elan_oc_records to authenticated;
create policy records_see on public.elan_oc_records for select to authenticated using(elan_private.oc_tool_ok(module_id,false));
create policy records_add on public.elan_oc_records for insert to authenticated with check(elan_private.oc_tool_ok(module_id,false) and created_by=(select auth.uid()));
create policy records_edit on public.elan_oc_records for update to authenticated using(elan_private.oc_tool_ok(module_id,false) and (created_by=(select auth.uid()) or elan_private.oc_tool_ok(module_id,false,true)));
create function elan_private.oc_stamp() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=clock_timestamp();return new;end$$;
create trigger oc_record_stamp before update on public.elan_oc_records for each row execute function elan_private.oc_stamp();
create index oc_records_scope on public.elan_oc_records(module_id,updated_at desc);
create table public.elan_oc_journal(id uuid primary key default gen_random_uuid(),module_id uuid not null references public.elan_oc_modules,book_date date not null,kind text not null check(kind in ('opening','receipt','spend','borrow','repay','equipment','invoice','collect','bill','settle')),amount numeric(14,2) not null check(amount>0 and amount<1000000000000),memo text not null check(length(trim(memo)) between 1 and 500),created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),reverses uuid unique references public.elan_oc_journal);
alter table public.elan_oc_journal enable row level security;
revoke all on public.elan_oc_journal from public,anon,authenticated;
grant select,insert(id,module_id,book_date,kind,amount,memo,reverses) on public.elan_oc_journal to authenticated;
create policy journal_read on public.elan_oc_journal for select to authenticated using(elan_private.oc_tool_ok(module_id,true));
create policy journal_post on public.elan_oc_journal for insert to authenticated with check(elan_private.oc_tool_ok(module_id,true,reverses is not null) and created_by=(select auth.uid()));
create function elan_private.oc_validate_reversal() returns trigger language plpgsql set search_path='' as $$begin
if new.reverses is not null and not exists(select 1 from public.elan_oc_journal j where j.id=new.reverses and j.module_id=new.module_id and j.kind=new.kind and j.amount=new.amount and j.reverses is null and j.book_date<=new.book_date) then raise exception 'Invalid reversal';end if;return new;end$$;
create trigger journal_reversal before insert on public.elan_oc_journal for each row execute function elan_private.oc_validate_reversal();
create index oc_journal_scope on public.elan_oc_journal(module_id,book_date desc);
create function public.elan_oc_accounts(p_module uuid,p_asof date) returns table(account text,debit numeric,credit numeric) language sql stable security invoker set search_path='' as $$
with mapping(kind,dr,cr) as (values ('opening','Funds','Opening capital'),('receipt','Funds','Income'),('spend','Expenses','Funds'),('borrow','Funds','Loans payable'),('repay','Loans payable','Funds'),('equipment','Equipment','Funds'),('invoice','Receivables','Income'),('collect','Funds','Receivables'),('bill','Expenses','Bills payable'),('settle','Bills payable','Funds')),
entries as(select m.dr,m.cr,j.amount,j.reverses from public.elan_oc_journal j join mapping m using(kind) where j.module_id=p_module and j.book_date<=p_asof)
select acct,sum(d),sum(c) from entries cross join lateral(values(dr,case when reverses is null then amount else 0 end,case when reverses is null then 0 else amount end),(cr,case when reverses is null then 0 else amount end,case when reverses is null then amount else 0 end)) as l(acct,d,c) group by acct$$;
revoke all on function public.elan_oc_accounts(uuid,date) from public,anon;
grant execute on function public.elan_oc_accounts(uuid,date) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('elan-oc-bills','elan-oc-bills',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy oc_bill_read on storage.objects for select to authenticated using(bucket_id='elan-oc-bills' and exists(select 1 from public.elan_oc_journal j where elan_private.oc_tool_ok(j.module_id,true) and j.module_id::text=split_part(storage.objects.name,'/',1) and j.id::text=split_part(name,'/',2)));
create policy oc_bill_write on storage.objects for insert to authenticated with check(bucket_id='elan-oc-bills' and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$' and exists(select 1 from public.elan_oc_journal j where elan_private.oc_tool_ok(j.module_id,true) and j.module_id::text=split_part(storage.objects.name,'/',1) and j.id::text=split_part(name,'/',2) and (j.created_by=(select auth.uid()) or elan_private.oc_tool_ok(j.module_id,true,true))));
