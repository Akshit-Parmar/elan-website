-- Incremental upgrade: preserves every existing photo.
create table public.elan_gallery_groups(name text primary key check(name=btrim(name) and length(name) between 1 and 80 and lower(name)<>'all'),sort_order integer not null default 0);
create unique index elan_gallery_groups_name_ci on public.elan_gallery_groups(lower(name));
insert into public.elan_gallery_groups(name,sort_order) select name,ordinality::int from unnest(array['Venue','Opening Ceremony','Day 1 Committee Sessions','DJ Night','Day 2 Committee Sessions','Closing Ceremony','Felicitations','Crisis Command','Cent$ible','Stage','People']) with ordinality as g(name,ordinality);
alter table public.elan_gallery_groups enable row level security;
revoke all on public.elan_gallery_groups from anon,authenticated;
grant select on public.elan_gallery_groups to anon,authenticated;
grant all on public.elan_gallery_groups to service_role;
create policy gallery_groups_read on public.elan_gallery_groups for select to anon,authenticated using(true);
alter table public.elan_media drop constraint elan_media_category_check;
alter table public.elan_media add constraint elan_media_category_check check(length(category) between 1 and 80);
create function elan_private.check_gallery_group() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(new.credit,'') not like 'site-slot:%' and coalesce(new.credit,'') not like 'site-image:%' then
  perform 1 from public.elan_gallery_groups where name=new.category for key share;
  if not found then raise exception 'This gallery group no longer exists. Reload the gallery and choose another group.';end if;
 end if;
 return new;
end $$;
revoke all on function elan_private.check_gallery_group() from public,anon,authenticated;
create trigger elan_check_gallery_group before insert or update on public.elan_media for each row execute function elan_private.check_gallery_group();
create function elan_private.manage_gallery_group(p_action text,p_name text,p_target text default null) returns void language plpgsql security definer set search_path='' as $$
declare old_name text:=btrim(p_name);new_name text:=btrim(p_target);
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if p_action is null or p_action not in ('create','rename','remove') then raise exception 'Invalid group action';end if;
 if old_name is null or length(old_name) not between 1 and 80 or lower(old_name)='all' then raise exception 'Use a group name of 1–80 characters, other than All';end if;
 lock table public.elan_media in share row exclusive mode;
 lock table public.elan_gallery_groups in share row exclusive mode;
 if p_action='create' then
  insert into public.elan_gallery_groups(name,sort_order) values(old_name,(select coalesce(max(sort_order),0)+1 from public.elan_gallery_groups));
 else
  if not exists(select 1 from public.elan_gallery_groups where name=old_name) then raise exception 'Group changed. Reload and try again.';end if;
  if p_action='rename' then
   if new_name is null or length(new_name) not between 1 and 80 or lower(new_name)='all' then raise exception 'Enter a new group name of 1–80 characters, other than All';end if;
   if new_name=old_name then return;end if;
   update public.elan_gallery_groups set name=new_name where name=old_name;
  else
   if (select count(*) from public.elan_gallery_groups)<2 then raise exception 'Keep at least one group for your photos.';end if;
   if exists(select 1 from public.elan_media where category=old_name and coalesce(credit,'') not like 'site-slot:%' and coalesce(credit,'') not like 'site-image:%') then
    if new_name is null or new_name=old_name or not exists(select 1 from public.elan_gallery_groups where name=new_name) then raise exception 'Choose another group for the existing photos.';end if;
   end if;
  end if;
  update public.elan_media set category=new_name where category=old_name and coalesce(credit,'') not like 'site-slot:%' and coalesce(credit,'') not like 'site-image:%';
  if p_action='remove' then delete from public.elan_gallery_groups where name=old_name;end if;
 end if;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'gallery-group:'||p_action,old_name);
end $$;
create function public.elan_manage_gallery_group(p_action text,p_name text,p_target text default null) returns void language sql security invoker set search_path='' as $$ select elan_private.manage_gallery_group(p_action,p_name,p_target); $$;
revoke all on function elan_private.manage_gallery_group(text,text,text),public.elan_manage_gallery_group(text,text,text) from public,anon;
grant execute on function elan_private.manage_gallery_group(text,text,text),public.elan_manage_gallery_group(text,text,text) to authenticated;

create or replace function elan_private.bulk_gallery(p_ids uuid[],p_action text,p_category text default null) returns setof public.elan_media language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if p_ids is null or p_action is null or cardinality(p_ids) not between 1 and 200 or p_action not in ('publish','hide','move') then raise exception 'Invalid bulk operation';end if;
 if p_action='move' and not exists(select 1 from public.elan_gallery_groups where name=p_category) then raise exception 'Choose a gallery group';end if;
 perform 1 from public.elan_media where id=any(p_ids) order by id for update;
 if (select count(*) from public.elan_media where id=any(p_ids) and coalesce(credit,'') not like 'site-slot:%' and coalesce(credit,'') not like 'site-image:%')<>cardinality(p_ids) then raise exception 'Selection changed. Reload and select gallery photos again.';end if;
 return query update public.elan_media set published=case p_action when 'publish' then true when 'hide' then false else published end,category=case when p_action='move' then p_category else category end where id=any(p_ids) returning *;
end $$;
