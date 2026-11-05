begin;
create table public.elan_editions (
 slug text primary key check (char_length(slug) between 1 and 80),
 title text not null check (char_length(title) between 1 and 160),
 summary text not null default '',
 starts_on date, ends_on date, venue text,
 status text not null check (status in ('archive','upcoming')),
 published boolean not null default false,
 check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create table public.elan_media (
 id uuid primary key default gen_random_uuid(),
 edition_slug text references public.elan_editions(slug),
 title text not null check(char_length(title) between 1 and 160),
 alt_text text not null check(char_length(alt_text) between 1 and 400),
 image_url text not null check(image_url like '/assets/img/%' or image_url like 'https://aptaodflhiopzjibyyzn.supabase.co/storage/v1/object/public/%'),
 category text not null check(category in ('Venue','Crisis Command','Cent$ible','Stage','People')),
 credit text not null default '',
 sort_order integer not null default 0,
 published boolean not null default false
);
alter table public.elan_editions enable row level security;
alter table public.elan_media enable row level security;
revoke all on public.elan_editions,public.elan_media from anon,authenticated;
grant select on public.elan_editions,public.elan_media to anon,authenticated;
create policy "Read published editions" on public.elan_editions for select to anon,authenticated using(published);
create policy "Read published media" on public.elan_media for select to anon,authenticated using(published);
create index elan_media_published_sort on public.elan_media(sort_order,id) where published;
insert into public.elan_editions(slug,title,summary,starts_on,ends_on,venue,status,published) values
('2026','The first edition','Two days of leadership, enterprise and connection.','2026-09-05','2026-09-06','SGIS Pune Campus, Mulshi','archive',true),
('next','The next chapter','Next-edition dates, venue and registration have not been announced.',null,null,null,'upcoming',true);
insert into public.elan_media(edition_slug,title,alt_text,image_url,category,sort_order,published) values
('2026','Where it began','SGIS Pune Campus in the green hills of Mulshi','/assets/img/partners/sgis-campus-aerial.jpg','Venue',1,true),
('2026','The welcome at SGIS','Entrance to Sanjay Ghodawat International School Pune Campus','/assets/img/partners/sgis-pune-entrance.jpg','Venue',2,true);
commit;
