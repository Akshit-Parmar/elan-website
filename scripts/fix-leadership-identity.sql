-- Existing project fix. Safe to re-run; does not delete members or reassign seats.
begin;
create or replace function elan_private.save_direct_member(p_id uuid,p_name text,p_email text,p_phone text,p_department text,p_role text,p_notes text,p_access text,p_expected integer) returns public.elan_oc_members_2027 language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_members_2027;old_email text;addr text:=lower(trim(p_email));target_user uuid;conflict_seat text;conflict_email text;
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
  if p_access in ('director','assistant') then
   -- Labels are display text, not account identities. Resolve the saved user ID.
   select id into target_user from auth.users where lower(trim(email))=addr and deleted_at is null;
   select v.seat,u.email into conflict_seat,conflict_email from public.elan_oc_reviewers v join auth.users u on u.id=v.user_id
   where (v.seat=p_access and v.user_id is distinct from target_user) or (v.seat<>p_access and v.user_id=target_user) limit 1;
   if found then raise exception 'Cannot appoint %: the % position is assigned to %. Check this assignment in Committee & access.',addr,case when conflict_seat='assistant' then 'Assistant Director' else 'Director' end,coalesce(conflict_email,'an account without an email');end if;
  end if;
  if p_access in ('director','assistant') and exists(select 1 from public.elan_oc_pending_access where access=p_access and member_id<>r.id) then raise exception 'This leadership position already has a pending appointment.';end if;
  insert into public.elan_oc_pending_access(member_id,email,department,access) values(r.id,addr,r.department,p_access) on conflict(member_id) do update set email=excluded.email,department=excluded.department,access=excluded.access,created_at=now();
  perform elan_private.activate_appointment(r.id);
 end if;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'save:direct_oc_member',r.id::text);
 return r;
end$$;

commit;
