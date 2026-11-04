-- Public historical records and private staff permissions are deliberately separate.
create table public.elan_oc_roster(id uuid primary key default gen_random_uuid(),department text not null check(length(trim(department)) between 1 and 90),name text not null check(length(trim(name)) between 1 and 150),role text not null check(length(trim(role)) between 1 and 150),bio text not null default '' check(length(bio)<=1500),portrait text not null default '',sort_order int not null default 50,published boolean not null default false);
create table public.elan_oc_access(user_id uuid primary key references auth.users on delete cascade,label text not null,department text not null check(length(trim(department)) between 1 and 90),role text not null check(role in ('member','lead')));
create table public.elan_oc_tasks(id uuid primary key default gen_random_uuid(),department text not null,assigned_to uuid not null references auth.users on delete cascade,title text not null check(length(trim(title)) between 1 and 200),brief text not null default '' check(length(brief)<=2500),status text not null default 'Open' check(status in ('Open','In progress','Done')));
create index oc_tasks_assigned on public.elan_oc_tasks(assigned_to);
create index oc_tasks_department on public.elan_oc_tasks(department);
alter table public.elan_oc_roster enable row level security;
alter table public.elan_oc_access enable row level security;
alter table public.elan_oc_tasks enable row level security;
revoke all on public.elan_oc_roster,public.elan_oc_access,public.elan_oc_tasks from public,anon,authenticated;
grant select on public.elan_oc_roster to anon,authenticated;
grant select,insert,update,delete on public.elan_oc_roster,public.elan_oc_tasks to authenticated;
grant select,delete on public.elan_oc_access to authenticated;
create policy roster_public on public.elan_oc_roster for select using(published);
create policy roster_admin on public.elan_oc_roster for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy access_self on public.elan_oc_access for select to authenticated using(user_id=(select auth.uid()));
create policy access_admin on public.elan_oc_access for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy task_admin on public.elan_oc_tasks for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy task_scoped on public.elan_oc_tasks for select to authenticated using(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_tasks.department and (a.role='lead' or elan_oc_tasks.assigned_to=a.user_id)));
create function elan_private.oc_grant(p_email text,p_department text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare who uuid; addr text;
begin
if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator required';end if;
select id,email into who,addr from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
if who is null then raise exception 'Ask the organiser to create and verify their account first.';end if;
insert into public.elan_oc_access(user_id,label,department,role) values(who,addr,trim(p_department),p_role) on conflict(user_id) do update set department=excluded.department,role=excluded.role,label=excluded.label;
end $$;
create function public.elan_oc_grant(p_email text,p_department text,p_role text) returns void language sql security invoker set search_path='' as $$select elan_private.oc_grant(p_email,p_department,p_role)$$;
create function elan_private.oc_progress(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
update public.elan_oc_tasks t set status=p_status where t.id=p_id and exists(select 1 from public.elan_oc_access a where a.user_id=auth.uid() and a.department=t.department and (a.role='lead' or t.assigned_to=a.user_id));
if not found then raise exception 'This responsibility is unavailable to your account.';end if;
end $$;
create function public.elan_oc_progress(p_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$select elan_private.oc_progress(p_id,p_status)$$;
revoke all on function elan_private.oc_grant(text,text,text),public.elan_oc_grant(text,text,text),elan_private.oc_progress(uuid,text),public.elan_oc_progress(uuid,text) from public,anon;
grant execute on function elan_private.oc_grant(text,text,text),public.elan_oc_grant(text,text,text),elan_private.oc_progress(uuid,text),public.elan_oc_progress(uuid,text) to authenticated;
insert into public.elan_oc_roster(department,name,role,portrait,sort_order,published) values
('Direction','Akshit Parmar','Director','/assets/founders/akshit-parmar.jpg',1,true),
('Direction','Sakshi Baldawa','Assistant Director','/assets/founders/sakshi-baldawa.png',2,true),
('Direction','Prachi Belagali','Department Head · All Departments','/assets/founders/prachi-belagali.png',3,true);
insert into public.elan_oc_roster(department,name,role,sort_order,published) values('Advisory','Vedant Gunda','Chief Advisor',4,true);
