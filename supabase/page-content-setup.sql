-- Additive setup for page content. Does not modify existing accounts or event data.
begin;
create table if not exists public.elan_page_content (
 key text primary key check(key ~ '^[a-f0-9]{32}$'),
 page text not null check(page ~ '^[a-z0-9-]+\.html$'),
 text text not null check(length(btrim(text)) between 1 and 6000),
 href text check(href is null or (length(href)<=2000 and href ~ '^(https://|mailto:|tel:|/($|[^/])|#[a-zA-Z])' and href !~ '[[:space:]]' and position(chr(92) in href)=0)),
 published boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.elan_page_content enable row level security;
revoke all on public.elan_page_content from anon,authenticated;
grant select on public.elan_page_content to anon;
grant select,insert,update on public.elan_page_content to authenticated;
grant all on public.elan_page_content to service_role;
create index if not exists elan_page_content_page_idx on public.elan_page_content(page);
drop policy if exists public_content_read on public.elan_page_content;
create policy public_content_read on public.elan_page_content for select to anon,authenticated using(published);
drop policy if exists admin_content_read on public.elan_page_content;
create policy admin_content_read on public.elan_page_content for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
drop policy if exists admin_content_insert on public.elan_page_content;
create policy admin_content_insert on public.elan_page_content for insert to authenticated with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
drop policy if exists admin_content_update on public.elan_page_content;
create policy admin_content_update on public.elan_page_content for update to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin')) with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
commit;
