-- Additive organiser tools. Existing content and permissions are retained.
create table public.elan_collection_revisions(id uuid primary key default gen_random_uuid(),table_name text not null,record_key text not null,before_data jsonb,after_data jsonb not null,created_at timestamptz not null default now(),actor_id uuid);
create index elan_collection_revision_lookup on public.elan_collection_revisions(table_name,record_key,created_at desc);
alter table public.elan_collection_revisions enable row level security;
revoke all on public.elan_collection_revisions from anon,authenticated;
grant select on public.elan_collection_revisions to authenticated;
create policy collection_history_admin on public.elan_collection_revisions for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create function elan_private.capture_collection() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and to_jsonb(OLD)=to_jsonb(NEW) then return NEW;end if;
 insert into public.elan_collection_revisions(table_name,record_key,before_data,after_data,actor_id) values(TG_TABLE_NAME,to_jsonb(NEW)->>TG_ARGV[0],case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,to_jsonb(NEW),auth.uid());return NEW;
end $$;
revoke all on function elan_private.capture_collection() from public,anon,authenticated;
create trigger elan_guest_history after insert or update on public.elan_guests for each row execute function elan_private.capture_collection('slug');
create trigger elan_media_history after insert or update on public.elan_media for each row execute function elan_private.capture_collection('id');
create trigger elan_story_history after insert or update on public.elan_stories for each row execute function elan_private.capture_collection('id');
create trigger elan_display_history after insert or update on public.elan_photo_settings for each row execute function elan_private.capture_collection('key');
insert into public.elan_collection_revisions(table_name,record_key,after_data) select 'elan_guests',slug,to_jsonb(g) from public.elan_guests g union all select 'elan_media',id::text,to_jsonb(m) from public.elan_media m union all select 'elan_stories',id::text,to_jsonb(s) from public.elan_stories s union all select 'elan_photo_settings',key,to_jsonb(p) from public.elan_photo_settings p;
create function elan_private.restore_collection(p_revision uuid,p_expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.elan_collection_revisions; k text; cols text; current_row jsonb; restored jsonb;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 select * into strict r from public.elan_collection_revisions where id=p_revision;
 k:=case r.table_name when 'elan_guests' then 'slug' when 'elan_media' then 'id' when 'elan_stories' then 'id' when 'elan_photo_settings' then 'key' else null end;
 if k is null then raise exception 'Unsupported content';end if;
 execute format('select to_jsonb(t) from public.%I t where %I::text=$1 for update',r.table_name,k) into current_row using r.record_key;
 if current_row is null then raise exception 'This entry no longer exists';end if;
 if current_row is distinct from p_expected then raise exception 'Content changed. Reload history before restoring.';end if;
 select string_agg(quote_ident(column_name),',' order by ordinal_position) into cols from information_schema.columns where table_schema='public' and table_name=r.table_name and column_name<>k;
 execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1)) where %I::text=$2 returning to_jsonb(t)',r.table_name,cols,cols,r.table_name,k) into restored using r.after_data,r.record_key;
 return restored;
end $$;
create function public.elan_restore_collection(p_revision uuid,p_expected jsonb) returns jsonb language sql security invoker set search_path='' as $$ select elan_private.restore_collection(p_revision,p_expected); $$;
revoke all on function elan_private.restore_collection(uuid,jsonb),public.elan_restore_collection(uuid,jsonb) from public,anon;
grant execute on function elan_private.restore_collection(uuid,jsonb),public.elan_restore_collection(uuid,jsonb) to authenticated;
create function elan_private.bulk_gallery(p_ids uuid[],p_action text,p_category text default null) returns setof public.elan_media language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if p_ids is null or p_action is null or cardinality(p_ids) not between 1 and 200 or p_action not in ('publish','hide','move') then raise exception 'Invalid bulk operation';end if;
 if p_action='move' and (p_category is null or p_category not in ('Venue','Opening Ceremony','Day 1 Committee Sessions','DJ Night','Day 2 Committee Sessions','Closing Ceremony','Felicitations','Crisis Command','Cent$ible','Stage','People')) then raise exception 'Choose a gallery group';end if;
 perform 1 from public.elan_media where id=any(p_ids) order by id for update;
 if (select count(*) from public.elan_media where id=any(p_ids) and coalesce(credit,'') not like 'site-slot:%' and coalesce(credit,'') not like 'site-image:%')<>cardinality(p_ids) then raise exception 'Selection changed. Reload and select gallery photos again.';end if;
 return query update public.elan_media set published=case p_action when 'publish' then true when 'hide' then false else published end,category=case when p_action='move' then p_category else category end where id=any(p_ids) returning *;
end $$;
create function public.elan_bulk_gallery(p_ids uuid[],p_action text,p_category text default null) returns setof public.elan_media language sql security invoker set search_path='' as $$ select * from elan_private.bulk_gallery(p_ids,p_action,p_category); $$;
revoke all on function elan_private.bulk_gallery(uuid[],text,text),public.elan_bulk_gallery(uuid[],text,text) from public,anon;
grant execute on function elan_private.bulk_gallery(uuid[],text,text),public.elan_bulk_gallery(uuid[],text,text) to authenticated;
create table public.elan_photo_fingerprints(media_id uuid primary key references public.elan_media(id) on delete cascade,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'));
create index elan_photo_hash_lookup on public.elan_photo_fingerprints(sha256);
alter table public.elan_photo_fingerprints enable row level security;
revoke all on public.elan_photo_fingerprints from anon,authenticated;
grant select,insert,update on public.elan_photo_fingerprints to authenticated;
create policy fingerprints_admin on public.elan_photo_fingerprints for all to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin')) with check(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create table public.elan_enquiry_workflow(enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,assigned_to uuid references public.elan_staff(user_id) on delete set null,notes text not null default '' check(length(notes)<=6000),follow_up date,version integer not null default 1,updated_at timestamptz not null default now());
create index elan_workflow_assignee on public.elan_enquiry_workflow(assigned_to);
alter table public.elan_enquiry_workflow enable row level security;
revoke all on public.elan_enquiry_workflow from anon,authenticated;
grant select on public.elan_enquiry_workflow to authenticated;
create policy workflow_admin on public.elan_enquiry_workflow for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create function elan_private.save_workflow(p_id uuid,p_assignee uuid,p_notes text,p_follow_up date,p_expected integer) returns public.elan_enquiry_workflow language plpgsql security definer set search_path='' as $$
declare result public.elan_enquiry_workflow;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,10));
 if p_expected is null then raise exception 'Expected version is required';end if;
 if coalesce((select version from public.elan_enquiry_workflow where enquiry_id=p_id),0)<>p_expected then raise exception 'Another organiser updated this enquiry. Reload before saving.';end if;
 insert into public.elan_enquiry_workflow(enquiry_id,assigned_to,notes,follow_up) values(p_id,p_assignee,p_notes,p_follow_up) on conflict(enquiry_id) do update set assigned_to=excluded.assigned_to,notes=excluded.notes,follow_up=excluded.follow_up,version=elan_enquiry_workflow.version+1,updated_at=now() returning * into result;return result;
end $$;
create function public.elan_save_workflow(p_id uuid,p_assignee uuid,p_notes text,p_follow_up date,p_expected integer) returns public.elan_enquiry_workflow language sql security invoker set search_path='' as $$ select elan_private.save_workflow(p_id,p_assignee,p_notes,p_follow_up,p_expected); $$;
create function elan_private.organiser_options() returns table(user_id uuid,label text) language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.elan_staff where elan_staff.user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 return query select s.user_id,coalesce(u.email,s.user_id::text)||' ('||s.role||')' from public.elan_staff s join auth.users u on u.id=s.user_id order by u.email;
end $$;
create function public.elan_organiser_options() returns table(user_id uuid,label text) language sql security invoker set search_path='' as $$select * from elan_private.organiser_options();$$;
revoke all on function elan_private.save_workflow(uuid,uuid,text,date,integer),public.elan_save_workflow(uuid,uuid,text,date,integer),elan_private.organiser_options(),public.elan_organiser_options() from public,anon;
grant execute on function elan_private.save_workflow(uuid,uuid,text,date,integer),public.elan_save_workflow(uuid,uuid,text,date,integer),elan_private.organiser_options(),public.elan_organiser_options() to authenticated;
create table public.elan_visit_totals(day date not null,page text not null,event text not null,hits integer not null default 0,primary key(day,page,event));
alter table public.elan_visit_totals enable row level security;
revoke all on public.elan_visit_totals from anon,authenticated;
grant select on public.elan_visit_totals to authenticated;
create policy metrics_admin on public.elan_visit_totals for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create function elan_private.record_visit(p_page text,p_event text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_page is null or p_event is null or p_page not in ('index','about','founders','first-edition','gallery','guests','flagship','next-edition','schools','volunteers','contact','school-collaboration','partners','archive','event-flow','event-details','schedule','centsible','faqs','tickets','enquire') or p_event not in ('view','engaged','exit','form_start','form_success') then return;end if;
 insert into public.elan_visit_totals(day,page,event,hits) values((now() at time zone 'Asia/Kolkata')::date,p_page,p_event,1) on conflict(day,page,event) do update set hits=least(elan_visit_totals.hits+1,100000);
end $$;
create function public.elan_record_visit(p_page text,p_event text) returns void language sql security invoker set search_path='' as $$select elan_private.record_visit(p_page,p_event);$$;
revoke all on function elan_private.record_visit(text,text),public.elan_record_visit(text,text) from public;
grant usage on schema elan_private to anon;
grant execute on function elan_private.record_visit(text,text),public.elan_record_visit(text,text) to anon,authenticated;
