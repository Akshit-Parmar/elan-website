begin;
create policy service_only on public.elan_audit for all to service_role using(true) with check(true);
create policy service_only on public.elan_enquiries for all to service_role using(true) with check(true);
create policy service_only on public.elan_rate_limits for all to service_role using(true) with check(true);
create function public.elan_claim_order(p_user uuid,p_registration uuid) returns public.elan_payments
language plpgsql security invoker set search_path='' as $$
declare r public.elan_registrations; p public.elan_payments;begin
 select * into r from public.elan_registrations where id=p_registration and owner_id=p_user for update;
 if not found or r.status<>'pending' or r.amount_paise<=0 then raise exception 'Registration not eligible for payment'; end if;
 select * into p from public.elan_payments where registration_id=r.id;
 if found then return p; end if;
 insert into public.elan_payments(registration_id,amount_paise) values(r.id,r.amount_paise) returning * into p;
 return p;
end $$;
create function public.elan_set_registration_status(p_id uuid,p_status text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare r public.elan_registrations;begin
 select * into r from public.elan_registrations where id=p_id for update;
 if not found or r.status<>'pending' then raise exception 'Only pending registrations can change status'; end if;
 if p_status='cancelled' then
 if exists(select 1 from public.elan_payments where registration_id=p_id) then raise exception 'Payment order exists; reconcile with provider first'; end if;
 elsif p_status='confirmed' then
 if r.amount_paise>0 and not exists(select 1 from public.elan_payments where registration_id=p_id and status='captured') then raise exception 'Captured payment required'; end if;
 else raise exception 'Unsupported status'; end if;
 update public.elan_registrations set status=p_status where id=p_id;
 return true;
end $$;
-- A token is used to claim a newly created payment row once, before provider calls.
alter table public.elan_payments add column processing_token uuid;
create function public.elan_lock_order(p_id uuid,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.elan_payments set processing_token=p_token where id=p_id and status='creating' and processing_token is null;
 return found;
end $$;
revoke all on function public.elan_claim_order(uuid,uuid),public.elan_set_registration_status(uuid,text),public.elan_lock_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.elan_claim_order(uuid,uuid),public.elan_set_registration_status(uuid,text),public.elan_lock_order(uuid,uuid) to service_role;
commit;
