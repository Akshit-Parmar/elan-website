create table public.elan_oc_board (
 id uuid primary key default gen_random_uuid(),
 department text not null check(length(trim(department)) between 1 and 90),
 audience text not null check(audience in ('department','lead','member')),
 kind text not null check(kind in ('briefing','resource')),
 title text not null check(length(trim(title)) between 1 and 160),
 body text not null default '' check(length(body)<=4000),
 url text not null default '' check(url='' or (url ~ '^https://[^[:space:]]+$' and length(url)<=2000)),
 created_by uuid default auth.uid(), created_at timestamptz not null default now(),
 check((kind='resource' and url<>'') or (kind='briefing' and length(trim(body))>0))
);
create index elan_oc_board_department on public.elan_oc_board(department,created_at desc);
alter table public.elan_oc_board enable row level security;
revoke all on public.elan_oc_board from public,anon,authenticated;
grant select,delete on public.elan_oc_board to authenticated;
grant insert(department,audience,kind,title,body,url) on public.elan_oc_board to authenticated;
create policy oc_admin_board on public.elan_oc_board for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy oc_board_read on public.elan_oc_board for select to authenticated using(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_board.department and (elan_oc_board.audience='department' or elan_oc_board.audience=a.role)));
create policy oc_board_lead_write on public.elan_oc_board for insert to authenticated with check(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_board.department and a.role='lead') and created_by=(select auth.uid()) and audience in ('department','lead'));
create policy oc_board_lead_remove on public.elan_oc_board for delete to authenticated using(created_by=(select auth.uid()) and exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_board.department and a.role='lead'));
