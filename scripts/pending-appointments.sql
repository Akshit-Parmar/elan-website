-- Incremental upgrade. Existing accounts, committee records and access remain intact.
create table public.elan_oc_pending_access(
 member_id uuid primary key references public.elan_oc_members_2027(id) on delete cascade,
 email text not null unique,
 department text not null,
 access text not null check(access in ('member','lead','director','assistant')),
 created_at timestamptz not null default now()
);
create unique index oc_pending_leadership_seat on public.elan_oc_pending_access(access) where access in ('director','assistant');
alter table public.elan_oc_pending_access enable row level security;
revoke all on public.elan_oc_pending_access from public,anon,authenticated;
grant select on public.elan_oc_pending_access to authenticated;
create policy pending_admin_read on public.elan_oc_pending_access for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));

create function elan_private.activate_appointment(p_member uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare p public.elan_oc_pending_access;u auth.users;is_admin boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('elan:appointments',0));
 select * into p from public.elan_oc_pending_access where member_id=p_member for update;
 if not found then return false;end if;
 select * into u from auth.users where lower(email)=p.email and email_confirmed_at is not null and deleted_at is null;
 if not found then return false;end if;
 is_admin:=exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin');
 if auth.uid() is null or (not is_admin and auth.uid()<>u.id) then raise exception 'Appointment unavailable';end if;
 if p.access in ('director','assistant') then
  if exists(select 1 from public.elan_oc_reviewers where (seat=p.access and user_id<>u.id) or (seat<>p.access and user_id=u.id)) then raise exception 'Leadership position is already assigned. Ask the administrator to review it.';end if;
  insert into public.elan_oc_reviewers(seat,user_id,label) values(p.access,u.id,u.email) on conflict(seat) do update set label=excluded.label;
 else
  if not is_admin and exists(select 1 from public.elan_oc_access where user_id=u.id and (role<>p.access or department<>p.department)) then raise exception 'Your access was changed after this appointment. Ask the administrator to review it.';end if;
  insert into public.elan_oc_access(user_id,label,department,role) values(u.id,u.email,p.department,p.access) on conflict(user_id) do update set department=excluded.department,role=excluded.role,label=excluded.label;
 end if;
 delete from public.elan_oc_pending_access where member_id=p.member_id;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'activate:oc_appointment',p.member_id::text);
 return true;
end$$;
revoke all on function elan_private.activate_appointment(uuid) from public,anon,authenticated;

create function elan_private.claim_appointment() returns boolean language plpgsql security definer set search_path='' as $$
declare m uuid;addr text;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select lower(email) into addr from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null;
 if addr is null then return false;end if;
 select member_id into m from public.elan_oc_pending_access where email=addr;
 if m is null then return false;end if;
 return elan_private.activate_appointment(m);
end$$;
create function public.elan_claim_appointment() returns boolean language sql security invoker set search_path='' as $$select elan_private.claim_appointment()$$;
revoke all on function elan_private.claim_appointment(),public.elan_claim_appointment() from public,anon;
grant execute on function elan_private.claim_appointment(),public.elan_claim_appointment() to authenticated;

create or replace function elan_private.save_direct_member(p_id uuid,p_name text,p_email text,p_phone text,p_department text,p_role text,p_notes text,p_access text,p_expected integer) returns public.elan_oc_members_2027 language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_members_2027;old_email text;addr text:=lower(trim(p_email));
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if p_access is null or p_access not in ('record_only','cancel_pending','member','lead','director','assistant') then raise exception 'Invalid permission';end if;
 perform pg_advisory_xact_lock(hashtextextended('elan:appointments',0));
 if p_id is not null then
  select * into r from public.elan_oc_members_2027 where id=p_id for update;
  if not found or r.version is distinct from p_expected then raise exception 'Member changed. Reload before saving';end if;
  old_email:=r.email;
  update public.elan_oc_members_2027 set name=trim(p_name),email=addr,phone=trim(p_phone),department=trim(p_department),role=trim(p_role),notes=p_notes,version=version+1,updated_at=now() where id=p_id returning * into r;
 else
  insert into public.elan_oc_members_2027(name,email,phone,department,role,notes) values(trim(p_name),addr,trim(p_phone),trim(p_department),trim(p_role),p_notes) returning * into r;
 end if;
 if p_access='cancel_pending' or (old_email is not null and old_email<>addr) then delete from public.elan_oc_pending_access where member_id=r.id;end if;
 if p_access not in ('record_only','cancel_pending') then
  if p_access in ('director','assistant') and exists(select 1 from public.elan_oc_reviewers where (seat=p_access and lower(label)<>addr) or (seat<>p_access and lower(label)=addr)) then raise exception 'This leadership appointment conflicts with an existing seat. Review Committee & access first.';end if;
  if p_access in ('director','assistant') and exists(select 1 from public.elan_oc_pending_access where access=p_access and member_id<>r.id) then raise exception 'This leadership position already has a pending appointment.';end if;
  insert into public.elan_oc_pending_access(member_id,email,department,access) values(r.id,addr,r.department,p_access) on conflict(member_id) do update set email=excluded.email,department=excluded.department,access=excluded.access,created_at=now();
  perform elan_private.activate_appointment(r.id);
 end if;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'save:direct_oc_member',r.id::text);
 return r;
end$$;

-- Keep the older leadership screen consistent with pending reservations.
create or replace function elan_private.review_seat(s text,email_in text) returns void language plpgsql security definer set search_path='' as $$
declare u auth.users;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator required';end if;
 if s not in ('director','assistant') then raise exception 'Invalid leadership position';end if;
 perform pg_advisory_xact_lock(hashtextextended('elan:appointments',0));
 if email_in='' then delete from public.elan_oc_pending_access where access=s;delete from public.elan_oc_reviewers where seat=s;return;end if;
 if exists(select 1 from public.elan_oc_pending_access where access=s and email<>lower(trim(email_in))) then raise exception 'This position has a pending appointment. Cancel it in 2027 OC members first.';end if;
 select * into strict u from auth.users where lower(email)=lower(trim(email_in)) and email_confirmed_at is not null and deleted_at is null;
 insert into public.elan_oc_reviewers values(s,u.id,u.email) on conflict(seat) do update set user_id=excluded.user_id,label=excluded.label;
 delete from public.elan_oc_pending_access where access=s and email=lower(trim(email_in));
end$$;
