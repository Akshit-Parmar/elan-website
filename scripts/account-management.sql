-- Additive: no existing account or application is deleted by this upgrade.
create table public.elan_oc_members_2027(
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 2 and 150),
 email text not null unique check(email=lower(trim(email)) and length(email)<=254 and email like '%@%.%'),
 phone text not null default '' check(length(phone)<=40),department text not null check(length(trim(department)) between 1 and 90),
 role text not null check(length(trim(role)) between 1 and 150),notes text not null default '' check(length(notes)<=3000),
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.elan_oc_members_2027 enable row level security;
revoke all on public.elan_oc_members_2027 from public,anon,authenticated;
grant select on public.elan_oc_members_2027 to authenticated;
grant all on public.elan_oc_members_2027 to service_role;
create policy members_2027_admin on public.elan_oc_members_2027 for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));

create function elan_private.account_blockers(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare reasons jsonb:='[]';r record;n bigint;begin
if exists(select 1 from public.elan_staff where user_id=p_id) then reasons:=reasons||jsonb_build_array('Staff accounts are protected.');end if;
-- Retain records and uploaded files rather than silently cascading business history.
for r in select c.table_name,c.column_name from information_schema.columns c where c.table_schema='public' and c.table_name like 'elan\_%' escape '\' and c.data_type='uuid' and c.column_name in ('owner_id','actor_id','actor','assigned_to','created_by','submitted_by','user_id') and c.table_name not in ('elan_profiles','elan_staff','elan_oc_access') loop
 execute format('select count(*) from public.%I where %I=$1',r.table_name,r.column_name) into n using p_id;
 if n>0 then reasons:=reasons||jsonb_build_array(replace(replace(r.table_name,'elan_',''),'_',' ')||': '||n||' linked record(s)');end if;
end loop;
select count(*) into n from storage.objects where owner_id=p_id::text;
if n>0 then reasons:=reasons||jsonb_build_array(n||' owned upload(s)');end if;
return reasons;end$$;
revoke all on function elan_private.account_blockers(uuid) from public,anon,authenticated;
create function elan_private.accounts(p_search text,p_offset integer) returns jsonb language plpgsql security definer set search_path='' as $$
begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
if p_offset<0 or p_offset>1000000 or length(p_search)>150 then raise exception 'Invalid search';end if;
return jsonb_build_object('total',(select count(*) from auth.users u left join public.elan_profiles p on p.user_id=u.id where u.deleted_at is null and (position(lower(p_search) in lower(coalesce(u.email,'')))>0 or position(lower(p_search) in lower(coalesce(p.full_name,'')))>0)),
'rows',coalesce((select jsonb_agg(x) from (select u.id,u.email,u.email_confirmed_at,u.created_at,u.last_sign_in_at,p.full_name,s.role,a.department from auth.users u left join public.elan_profiles p on p.user_id=u.id left join public.elan_staff s on s.user_id=u.id left join public.elan_oc_access a on a.user_id=u.id where u.deleted_at is null and (position(lower(p_search) in lower(coalesce(u.email,'')))>0 or position(lower(p_search) in lower(coalesce(p.full_name,'')))>0) order by u.created_at desc,u.id limit 30 offset p_offset)x),'[]'::jsonb));end$$;
create function public.elan_accounts(p_search text default '',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select elan_private.accounts(p_search,p_offset)$$;
create function elan_private.account_removal_check(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare addr text;begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
if p_id=auth.uid() then raise exception 'You cannot delete your own account here';end if;
select email into addr from auth.users where id=p_id and deleted_at is null;if not found then raise exception 'Account not found';end if;
return jsonb_build_object('email',addr,'blockers',elan_private.account_blockers(p_id));end$$;
create function public.elan_account_removal_check(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select elan_private.account_removal_check(p_id)$$;

create function elan_private.delete_application(p_id uuid,p_email text,p_expected integer) returns void language plpgsql security definer set search_path='' as $$
declare e public.elan_enquiries;begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
select * into e from public.elan_enquiries where id=p_id for update;
if not found or not(coalesce(e.details->>'intent'='2027 organising committee application',false) or coalesce(e.details->>'application_version','')='2') then raise exception 'OC application not found';end if;
if lower(trim(p_email)) is distinct from lower(e.email) then raise exception 'Type the applicant email exactly to confirm';end if;
if p_expected is distinct from coalesce((select version from public.elan_oc_recruitment where enquiry_id=p_id),0) then raise exception 'Application changed. Reload before deleting';end if;
perform 1 from public.elan_acknowledgements where enquiry_id=p_id for update;
if exists(select 1 from public.elan_acknowledgements where enquiry_id=p_id and status='sending') then raise exception 'An acknowledgement is still sending. Resolve its delivery state before deleting';end if;
delete from public.elan_enquiries where id=p_id;
insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'delete:oc_application',p_id::text);
end$$;
create function public.elan_delete_application(p_id uuid,p_email text,p_expected integer) returns void language sql security invoker set search_path='' as $$select elan_private.delete_application(p_id,p_email,p_expected)$$;

create function elan_private.save_direct_member(p_id uuid,p_name text,p_email text,p_phone text,p_department text,p_role text,p_notes text,p_access text,p_expected integer) returns public.elan_oc_members_2027 language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_members_2027;begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
if p_access is null or p_access not in ('record_only','member','lead') then raise exception 'Invalid permission';end if;
if p_id is not null then
 select * into r from public.elan_oc_members_2027 where id=p_id for update;
 if not found or r.version is distinct from p_expected then raise exception 'Member changed. Reload before saving';end if;
 update public.elan_oc_members_2027 set name=trim(p_name),email=lower(trim(p_email)),phone=trim(p_phone),department=trim(p_department),role=trim(p_role),notes=p_notes,version=version+1,updated_at=now() where id=p_id returning * into r;
else
 insert into public.elan_oc_members_2027(name,email,phone,department,role,notes) values(trim(p_name),lower(trim(p_email)),trim(p_phone),trim(p_department),trim(p_role),p_notes) returning * into r;
end if;
if p_access<>'record_only' then perform elan_private.oc_grant(r.email,r.department,p_access);end if;
insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'save:direct_oc_member',r.id::text);
return r;end$$;
create function public.elan_save_direct_member(p_id uuid,p_name text,p_email text,p_phone text,p_department text,p_role text,p_notes text,p_access text,p_expected integer) returns public.elan_oc_members_2027 language sql security invoker set search_path='' as $$select elan_private.save_direct_member(p_id,p_name,p_email,p_phone,p_department,p_role,p_notes,p_access,p_expected)$$;
revoke all on function elan_private.accounts(text,integer),public.elan_accounts(text,integer),elan_private.account_removal_check(uuid),public.elan_account_removal_check(uuid),elan_private.delete_application(uuid,text,integer),public.elan_delete_application(uuid,text,integer),elan_private.save_direct_member(uuid,text,text,text,text,text,text,text,integer),public.elan_save_direct_member(uuid,text,text,text,text,text,text,text,integer) from public,anon;
grant execute on function elan_private.accounts(text,integer),public.elan_accounts(text,integer),elan_private.account_removal_check(uuid),public.elan_account_removal_check(uuid),elan_private.delete_application(uuid,text,integer),public.elan_delete_application(uuid,text,integer),elan_private.save_direct_member(uuid,text,text,text,text,text,text,text,integer),public.elan_save_direct_member(uuid,text,text,text,text,text,text,text,integer) to authenticated;
