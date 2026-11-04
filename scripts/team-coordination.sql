alter table public.elan_oc_requests add column revisit_on date,add column revisit_owner text check(revisit_owner in ('director','assistant')),add column before_record jsonb;
create function elan_private.oc_capture_previous() returns trigger language plpgsql security definer set search_path='' as $$
declare h jsonb;
begin
if new.kind='record' and new.payload->>'target' is not null then select jsonb_build_object('title',title,'details',details) into new.before_record from public.elan_oc_records where id=(new.payload->>'target')::uuid and module_id=(new.payload->>'module_id')::uuid;end if;
if new.payload ? 'handoffs' then
 if new.kind<>'record' or not exists(select 1 from public.elan_oc_modules where id=(new.payload->>'module_id')::uuid and tool='partnerships') or jsonb_typeof(new.payload->'handoffs')<>'array' or jsonb_array_length(new.payload->'handoffs')>8 then raise exception 'Invalid handoffs';end if;
 for h in select value from jsonb_array_elements(new.payload->'handoffs') loop
 if not exists(select 1 from public.elan_oc_modules where department=h->>'department' and department<>new.department) or coalesce(length(trim(h->>'brief')),0) not between 1 and 400 then raise exception 'Choose a receiving department and a short responsibility';end if;end loop;
end if;return new;end$$;
create trigger oc_capture_previous before insert on public.elan_oc_requests for each row execute function elan_private.oc_capture_previous();
create table public.elan_oc_handoffs(id uuid primary key default gen_random_uuid(),source_id uuid not null references public.elan_oc_requests,department text not null,brief text not null,status text not null default 'Open' check(status in ('Open','In progress','Done')),created_at timestamptz default now());
create index handoffs_department on public.elan_oc_handoffs(department,created_at desc);
alter table public.elan_oc_handoffs enable row level security;
revoke all on public.elan_oc_handoffs from public,anon,authenticated;
grant select,update(status) on public.elan_oc_handoffs to authenticated;
create policy handoff_read on public.elan_oc_handoffs for select to authenticated using(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_handoffs.department));
create policy handoff_lead on public.elan_oc_handoffs for update to authenticated using(exists(select 1 from public.elan_oc_access a where a.user_id=(select auth.uid()) and a.department=elan_oc_handoffs.department and a.role='lead'));
create function elan_private.oc_release_handoffs() returns trigger language plpgsql security definer set search_path='' as $$begin
if new.status='approved' and old.status<>'approved' then insert into public.elan_oc_handoffs(source_id,department,brief) select new.id,x->>'department',x->>'brief' from jsonb_array_elements(new.payload->'handoffs') x;end if;
if new.round<>old.round then new.revisit_on=null;new.revisit_owner=null;end if;return new;end$$;
create trigger oc_release_handoffs before update on public.elan_oc_requests for each row execute function elan_private.oc_release_handoffs();
create function elan_private.review_with_plan(i uuid,d text,n text,due date,owner_seat text) returns text language plpgsql security definer set search_path='' as $$begin
if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) then raise exception 'Reviewer required';end if;
if d='later' then
 if due is null or due<(now() at time zone 'Asia/Kolkata')::date or owner_seat is null or owner_seat not in ('director','assistant') then raise exception 'Choose a revisit date and a responsible leader';end if;
 update public.elan_oc_requests set revisit_on=due,revisit_owner=owner_seat where id=i and status='pending';end if;
return elan_private.review_decide(i,d,n);end$$;
create function public.elan_review_with_plan(i uuid,d text,n text,due date,owner_seat text) returns text language sql security invoker set search_path='' as $$select elan_private.review_with_plan(i,d,n,due,owner_seat)$$;
revoke all on function public.elan_review_with_plan(uuid,text,text,date,text),elan_private.review_with_plan(uuid,text,text,date,text) from public,anon;
grant execute on function public.elan_review_with_plan(uuid,text,text,date,text),elan_private.review_with_plan(uuid,text,text,date,text) to authenticated;
create or replace function public.elan_review_decide(i uuid,d text,n text) returns text language sql security invoker set search_path='' as $$select elan_private.review_with_plan(i,d,n,null,null)$$;
revoke execute on function elan_private.review_decide(uuid,text,text) from authenticated;
revoke all on function elan_private.oc_capture_previous(),elan_private.oc_release_handoffs() from public,anon,authenticated;
