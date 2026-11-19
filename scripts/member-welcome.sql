begin;
create function elan_private.welcome_assignment() returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null)
 and not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then
 coalesce((select 'leadership:'||seat from public.elan_oc_reviewers where user_id=auth.uid() and seat in ('director','assistant') limit 1),
 (select department||':'||role from public.elan_oc_access where user_id=auth.uid() and role in ('lead','member') limit 1)) end
$$;
create table public.elan_welcome_progress(
 user_id uuid primary key references auth.users(id) on delete cascade,
 assignment text not null,
 role_read boolean not null default false,
 brief_read boolean not null default false,
 conduct_read boolean not null default false,
 first_task_read boolean not null default false
);
alter table public.elan_welcome_progress enable row level security;
revoke all on public.elan_welcome_progress from public,anon,authenticated;
grant select,insert,update on public.elan_welcome_progress to authenticated;
create policy welcome_read on public.elan_welcome_progress for select to authenticated using(user_id=(select auth.uid()) and (select elan_private.welcome_assignment()) is not null);
create policy welcome_insert on public.elan_welcome_progress for insert to authenticated with check(user_id=(select auth.uid()) and assignment=(select elan_private.welcome_assignment()));
create policy welcome_update on public.elan_welcome_progress for update to authenticated using(user_id=(select auth.uid()) and (select elan_private.welcome_assignment()) is not null) with check(user_id=(select auth.uid()) and assignment=(select elan_private.welcome_assignment()));
create function public.elan_welcome_assignment() returns text language sql security invoker set search_path='' as $$select elan_private.welcome_assignment()$$;
revoke all on function elan_private.welcome_assignment(),public.elan_welcome_assignment() from public,anon;
grant execute on function elan_private.welcome_assignment(),public.elan_welcome_assignment() to authenticated;
commit;
