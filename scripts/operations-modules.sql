-- Ensure custom department appointments always receive a working register.
create function elan_private.ensure_ops_module() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.elan_oc_modules(department,tool) values(new.department,
 case when new.department ~* 'finance' then 'finance' when new.department ~* 'social' then 'social' when new.department ~* 'design|media' then 'media'
 when new.department ~* 'sponsor|partner' then 'partnerships' when new.department ~* 'outreach|ambassador' then 'outreach'
 when new.department ~* 'logistics|hospitality' then 'operations' when new.department ~* 'programme|crisis' then 'programme' else 'general' end)
 on conflict(department) do nothing;return new;
end$$;
revoke all on function elan_private.ensure_ops_module() from public,anon,authenticated;
create trigger ensure_ops_module after insert or update of department on public.elan_oc_access for each row execute function elan_private.ensure_ops_module();
insert into public.elan_oc_modules(department,tool) values('Documentation','general'),('Campus Ambassadors','outreach') on conflict(department) do nothing;
insert into public.elan_oc_modules(department,tool) select distinct department,'general' from public.elan_oc_access on conflict(department) do nothing;
