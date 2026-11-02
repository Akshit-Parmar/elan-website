-- Incremental editor upgrade. Existing published content is retained.
create table public.elan_page_drafts(page text primary key check(page ~ '^[a-z0-9-]+\.html$'),changes jsonb not null default '[]' check(jsonb_typeof(changes)='array' and octet_length(changes::text)<1000000),version bigint not null default 1,updated_at timestamptz not null default now());
create table public.elan_page_revisions(id uuid primary key default gen_random_uuid(),page text not null,changes jsonb not null,before_changes jsonb not null,created_at timestamptz not null default now(),created_by uuid not null references auth.users(id));
create index elan_page_revisions_page_time on public.elan_page_revisions(page,created_at desc);
create table public.elan_stories(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('testimonial','story','film')),title text not null check(length(title) between 1 and 160),name text not null default '' check(length(name)<=150),role text not null default '' check(length(role)<=200),body text not null default '' check(length(body)<=3000),image_url text not null default '' check(image_url='' or (image_url like '/assets/%' and image_url not like '%..%') or image_url like 'https://aptaodflhiopzjibyyzn.supabase.co/storage/v1/object/public/elan-public-media/%'),video_url text not null default '' check(video_url='' or video_url ~ '^https://(www\.)?(youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}|youtu\.be/[a-zA-Z0-9_-]{11}|vimeo\.com/[0-9]+)$'),approved boolean not null default false,published boolean not null default false,sort_order integer not null default 0 check(sort_order between 0 and 10000),check(not published or (approved and (case when kind='film' then video_url<>'' else length(name)>0 and length(body)>0 end))));
create index elan_stories_public_order on public.elan_stories(sort_order,id) where published and approved;
alter table public.elan_page_drafts enable row level security;
alter table public.elan_page_revisions enable row level security;
alter table public.elan_stories enable row level security;
revoke all on public.elan_page_drafts,public.elan_page_revisions,public.elan_stories from anon,authenticated;
grant select on public.elan_page_drafts,public.elan_page_revisions to authenticated;
grant select on public.elan_stories to anon,authenticated;
grant insert,update,delete on public.elan_stories to authenticated;
create policy draft_admin on public.elan_page_drafts for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy revision_admin on public.elan_page_revisions for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create policy story_public on public.elan_stories for select to anon,authenticated using(published and approved);
create policy story_admin on public.elan_stories for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin')) with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
-- Placement restores use bundled images outside the original img directory too.
alter table public.elan_media drop constraint elan_media_image_url_check;
alter table public.elan_media add constraint elan_media_image_url_check check((image_url like '/assets/%' and image_url not like '%..%') or image_url like 'https://aptaodflhiopzjibyyzn.supabase.co/storage/v1/object/public/elan-public-media/%');
create function public.elan_save_page_draft(p_page text,p_changes jsonb,p_expected bigint) returns bigint language plpgsql security definer set search_path='' as $$
declare v bigint;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('elan-page:'||p_page,0));
 select version into v from public.elan_page_drafts where page=p_page;
 if p_expected is null or coalesce(v,0)<>p_expected then raise exception 'A newer draft exists. Reload before saving.';end if;
 insert into public.elan_page_drafts(page,changes,version) values(p_page,p_changes,1) on conflict(page) do update set changes=excluded.changes,version=elan_page_drafts.version+1,updated_at=now() returning version into v;
 return v;
end $$;
create function public.elan_publish_page_draft(p_page text,p_version bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare d public.elan_page_drafts; c jsonb; oldcopy public.elan_page_content; oldphoto public.elan_media; previous jsonb:='[]'; rid uuid; keyid text;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('elan-page:'||p_page,0));
 select * into d from public.elan_page_drafts where page=p_page for update;
 if p_version is null or d.page is null or d.version<>p_version then raise exception 'Draft changed. Reload before publishing.';end if;
 if jsonb_array_length(d.changes)=0 then raise exception 'There are no draft changes to publish';end if;
 for c in select value from jsonb_array_elements(d.changes) loop
  if c->>'type'='text' then
   keyid:=c->>'key';if keyid !~ '^[a-f0-9]{32}$' then raise exception 'Invalid text key';end if;
   select * into oldcopy from public.elan_page_content where key=keyid;
   if found and oldcopy.page<>p_page then raise exception 'Text belongs to another page';end if;
   previous:=previous||jsonb_build_array(c||jsonb_build_object('text',coalesce(oldcopy.text,c->>'original_text'),'href',coalesce(oldcopy.href,c->>'original_href'),'restore',not coalesce(oldcopy.published,false)));
   insert into public.elan_page_content(key,page,text,href,published,updated_at) values(keyid,p_page,c->>'text',c->>'href',not coalesce((c->>'restore')::boolean,false),now()) on conflict(key) do update set text=excluded.text,href=excluded.href,published=excluded.published,updated_at=now();
  elsif c->>'type'='image' then
   keyid:=c->>'slot';if keyid is null or keyid !~ '^[a-zA-Z0-9_-]{1,150}$' then raise exception 'Invalid photo placement';end if;
   select * into oldphoto from public.elan_media where id=(c->>'id')::uuid;
   if found and oldphoto.credit<>'site-slot:'||keyid then raise exception 'Photo identifier is already in use';end if;
   previous:=previous||jsonb_build_array(c||jsonb_build_object('url',coalesce(oldphoto.image_url,c->>'original_src'),'alt',coalesce(oldphoto.alt_text,c->>'original_alt')));
   insert into public.elan_media(id,edition_slug,title,alt_text,image_url,category,credit,sort_order,published) values((c->>'id')::uuid,'next',left('Website placement: '||p_page,160),c->>'alt',c->>'url','People','site-slot:'||keyid,10000,true) on conflict(id) do update set alt_text=excluded.alt_text,image_url=excluded.image_url,published=true;
  else raise exception 'Unknown draft item';end if;
 end loop;
 insert into public.elan_page_revisions(page,changes,before_changes,created_by) values(p_page,d.changes,previous,auth.uid()) returning id into rid;
 update public.elan_page_drafts set changes='[]',version=version+1,updated_at=now() where page=p_page;
 return rid;
end $$;
create function public.elan_reorder_gallery(p_ids uuid[]) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 n:=coalesce(cardinality(p_ids),0);if n=0 or n>10000 or (select count(distinct x) from unnest(p_ids) x)<>n then raise exception 'Invalid photo order';end if;
 perform pg_advisory_xact_lock(hashtextextended('elan-gallery-order',0));
 if (select count(*) from public.elan_media where id=any(p_ids) and credit not like 'site-slot:%' and credit not like 'site-image:%')<>n then raise exception 'Photo collection changed. Reload before reordering.';end if;
 update public.elan_media m set sort_order=x.pos from (select id,ordinality::integer as pos from unnest(p_ids) with ordinality t(id,ordinality)) x where m.id=x.id;
 return n;
end $$;
revoke all on function public.elan_save_page_draft(text,jsonb,bigint),public.elan_publish_page_draft(text,bigint),public.elan_reorder_gallery(uuid[]) from public,anon;
grant execute on function public.elan_save_page_draft(text,jsonb,bigint),public.elan_publish_page_draft(text,bigint),public.elan_reorder_gallery(uuid[]) to authenticated;

create schema if not exists elan_private;
revoke all on schema elan_private from public,anon;
grant usage on schema elan_private to authenticated;
alter function public.elan_save_page_draft(text,jsonb,bigint) set schema elan_private;
alter function public.elan_publish_page_draft(text,bigint) set schema elan_private;
alter function public.elan_reorder_gallery(uuid[]) set schema elan_private;
create function public.elan_save_page_draft(p_page text,p_changes jsonb,p_expected bigint) returns bigint language sql security invoker set search_path='' as $$ select elan_private.elan_save_page_draft(p_page,p_changes,p_expected); $$;
create function public.elan_publish_page_draft(p_page text,p_version bigint) returns uuid language sql security invoker set search_path='' as $$ select elan_private.elan_publish_page_draft(p_page,p_version); $$;
create function public.elan_reorder_gallery(p_ids uuid[]) returns integer language sql security invoker set search_path='' as $$ select elan_private.elan_reorder_gallery(p_ids); $$;
revoke all on function public.elan_save_page_draft(text,jsonb,bigint),public.elan_publish_page_draft(text,bigint),public.elan_reorder_gallery(uuid[]) from public,anon;
grant execute on function public.elan_save_page_draft(text,jsonb,bigint),public.elan_publish_page_draft(text,bigint),public.elan_reorder_gallery(uuid[]) to authenticated;
