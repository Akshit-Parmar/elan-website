create table public.elan_winners (
 id uuid primary key default gen_random_uuid(),
 edition_slug text not null default '2026' check(edition_slug='2026'),
 competition text not null check(competition in ('Crisis Command','Cent$ible','Other honours')),
 award text not null check(length(trim(award)) between 1 and 160),
 name text not null check(length(trim(name)) between 1 and 200),
 members text not null default '' check(length(members)<=2000),
 school text not null default '' check(length(school)<=300),
 introduction text not null default '' check(length(introduction)<=600),
 reflection text not null default '' check(length(reflection)<=2000),
 image_url text not null default '' check(image_url='' or (image_url like '/assets/%' and image_url not like '%..%') or image_url like 'https://aptaodflhiopzjibyyzn.supabase.co/storage/v1/object/public/elan-public-media/%'),
 sort_order integer not null default 0 check(sort_order between 0 and 10000),
 approved boolean not null default false,
 published boolean not null default false,
 check(not published or approved)
);
alter table public.elan_winners enable row level security;
revoke all on public.elan_winners from anon,authenticated;
grant select on public.elan_winners to anon,authenticated;
grant insert,update,delete on public.elan_winners to authenticated;
create policy winners_public on public.elan_winners for select to anon,authenticated using(published and approved);
create policy winners_admin on public.elan_winners for all to authenticated
 using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'))
 with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create index elan_winners_order on public.elan_winners(competition,sort_order,id);

