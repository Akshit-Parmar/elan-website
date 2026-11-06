-- Admin-only lookup, bound to a saved member rather than a client-supplied email.
create function elan_private.oc_invitation_target(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.elan_oc_members_2027;u auth.users;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 select * into m from public.elan_oc_members_2027 where id=p_id;
 if not found then raise exception 'Member not found';end if;
 select * into u from auth.users where lower(email)=m.email and deleted_at is null;
 return jsonb_build_object('email',m.email,'name',m.name,'account_exists',u.id is not null,'verified',u.email_confirmed_at is not null,'invited',u.invited_at is not null,'pending',exists(select 1 from public.elan_oc_pending_access where member_id=m.id and email=m.email));
end$$;
create function public.elan_oc_invitation_target(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select elan_private.oc_invitation_target(p_id)$$;
revoke all on function elan_private.oc_invitation_target(uuid),public.elan_oc_invitation_target(uuid) from public,anon;
grant execute on function elan_private.oc_invitation_target(uuid),public.elan_oc_invitation_target(uuid) to authenticated;
