-- Additive upgrade: keeps all existing photos and published content.
create table public.elan_photo_settings (
 key text primary key check(length(key) between 1 and 240 and key ~ '^[a-zA-Z0-9_.:-]+$'),
 focal_x integer not null default 50 check(focal_x between 0 and 100),
 focal_y integer not null default 50 check(focal_y between 0 and 100),
 featured boolean not null default false,
 is_cover boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.elan_photo_settings enable row level security;
revoke all on public.elan_photo_settings from anon,authenticated;
grant select on public.elan_photo_settings to anon,authenticated;
grant insert,update,delete on public.elan_photo_settings to authenticated;
create policy photo_settings_public on public.elan_photo_settings for select to anon,authenticated using(true);
create policy photo_settings_admin on public.elan_photo_settings for all to authenticated
 using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'))
 with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
