begin;
create table public.elan_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(full_name) between 2 and 120),
 phone text not null default '' check(length(phone)<=30), school text not null default '' check(length(school)<=180),
 created_at timestamptz not null default now()
);
create table public.elan_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','organiser')), created_at timestamptz not null default now()
);
create table public.elan_registration_settings (
 edition_slug text primary key references public.elan_editions(slug),
 registration_open boolean not null default false, price_paise integer not null default 0 check(price_paise between 0 and 10000000),
 capacity integer not null default 200 check(capacity between 1 and 100000), min_age integer not null default 14 check(min_age>=1), max_age integer not null default 20 check(max_age>=min_age),
 registration_closes_at timestamptz, terms_version text not null default '', terms_text text not null default '',
 check(not registration_open or (length(terms_version)>0 and length(terms_text)>20))
);
insert into public.elan_registration_settings(edition_slug) select slug from public.elan_editions;
create table public.elan_registrations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), edition_slug text not null references public.elan_editions(slug),
 request_key uuid not null, kind text not null check(kind in ('individual','school')), school text not null check(length(school) between 2 and 180),
 coordinator_name text not null check(length(coordinator_name) between 2 and 120), phone text not null check(length(phone) between 6 and 30),
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 participant_count integer not null check(participant_count between 1 and 50), amount_paise integer not null check(amount_paise>=0),
 terms_version text not null, terms_text text not null, consent_confirmed boolean not null check(consent_confirmed), created_at timestamptz not null default now(),
 unique(owner_id,request_key)
);
create index on public.elan_registrations(owner_id,created_at desc);
create index on public.elan_registrations(edition_slug,status);
create table public.elan_attendees (
 id uuid primary key default gen_random_uuid(), registration_id uuid not null references public.elan_registrations(id) on delete cascade,
 full_name text not null check(length(full_name) between 2 and 120), age integer not null check(age between 1 and 100), grade text not null check(length(grade) between 1 and 60),
 allocation text not null default '' check(length(allocation)<=300), checked_in_at timestamptz
);
create index on public.elan_attendees(registration_id);
create table public.elan_payments (
 id uuid primary key default gen_random_uuid(), registration_id uuid not null unique references public.elan_registrations(id),
 order_id text unique, payment_id text unique, amount_paise integer not null check(amount_paise>0), currency text not null default 'INR' check(currency='INR'),
 status text not null default 'creating' check(status in ('creating','created','captured','failed','refunded')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.elan_enquiries (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('contact','school','volunteer')),
 full_name text not null check(length(full_name) between 2 and 120), email text not null check(length(email) between 3 and 254),
 details jsonb not null check(octet_length(details::text)<=12000), status text not null default 'new' check(status in ('new','in_progress','resolved')),
 created_at timestamptz not null default now()
);
create table public.elan_support (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), subject text not null check(length(subject) between 3 and 160),
 message text not null check(length(message) between 10 and 5000), reply text not null default '' check(length(reply)<=5000),
 status text not null default 'open' check(status in ('open','answered','closed')), created_at timestamptz not null default now()
);
create index on public.elan_support(user_id,created_at desc);
create table public.elan_submissions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), registration_id uuid not null references public.elan_registrations(id),
 title text not null check(length(title) between 2 and 160), object_path text not null unique, created_at timestamptz not null default now()
);
create index on public.elan_submissions(user_id,created_at desc);
create index on public.elan_submissions(registration_id);
create table public.elan_announcements (
 id uuid primary key default gen_random_uuid(), edition_slug text not null references public.elan_editions(slug), title text not null check(length(title) between 2 and 160),
 body text not null check(length(body) between 2 and 10000), published boolean not null default false, created_at timestamptz not null default now()
);
create index on public.elan_announcements(edition_slug,created_at desc);
create table public.elan_schedule (
 id uuid primary key default gen_random_uuid(), edition_slug text not null references public.elan_editions(slug), title text not null check(length(title) between 2 and 160),
 starts_at timestamptz not null, ends_at timestamptz, location text not null default '' check(length(location)<=200), details text not null default '' check(length(details)<=3000),
 published boolean not null default false, check(ends_at is null or ends_at>=starts_at)
);
create index on public.elan_schedule(edition_slug,starts_at);
create table public.elan_guests (
 slug text primary key check(slug ~ '^[a-z0-9-]{1,80}$'), edition_slug text not null references public.elan_editions(slug),
 name text not null check(length(name) between 2 and 150), role text not null check(length(role) between 2 and 120), position text not null default '',
 bio text not null check(length(bio) between 10 and 12000), image_url text not null default '', sort_order integer not null default 0, published boolean not null default false
);
create index on public.elan_guests(edition_slug,sort_order);
create table public.elan_audit (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null, target text not null, created_at timestamptz not null default now()
);
create index on public.elan_audit(actor_id,created_at desc);
create table public.elan_rate_limits (key text primary key, window_start timestamptz not null, hits integer not null);
-- The Edge API performs mutations after validating a current Auth user and its DB-backed staff role.
-- Browser roles are read-only; ownership RLS is additional protection.
do $$ declare t text; begin
 foreach t in array array['elan_profiles','elan_staff','elan_registration_settings','elan_registrations','elan_attendees','elan_payments','elan_enquiries','elan_support','elan_submissions','elan_announcements','elan_schedule','elan_guests','elan_audit','elan_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.elan_audit_id_seq to service_role;
grant select on public.elan_profiles,public.elan_staff,public.elan_registrations,public.elan_attendees,public.elan_payments,public.elan_support,public.elan_submissions to authenticated;
grant select on public.elan_registration_settings,public.elan_announcements,public.elan_schedule,public.elan_guests to anon,authenticated;
create policy own_profile on public.elan_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_role on public.elan_staff for select to authenticated using(user_id=(select auth.uid()));
create policy own_registration on public.elan_registrations for select to authenticated using(owner_id=(select auth.uid()));
create policy own_attendees on public.elan_attendees for select to authenticated using(exists(select 1 from public.elan_registrations r where r.id=registration_id and r.owner_id=(select auth.uid())));
create policy own_payment on public.elan_payments for select to authenticated using(exists(select 1 from public.elan_registrations r where r.id=registration_id and r.owner_id=(select auth.uid())));
create policy own_support on public.elan_support for select to authenticated using(user_id=(select auth.uid()));
create policy own_submission on public.elan_submissions for select to authenticated using(user_id=(select auth.uid()));
create policy published_settings on public.elan_registration_settings for select to anon,authenticated using(exists(select 1 from public.elan_editions e where e.slug=edition_slug and e.published));
create policy published_announcements on public.elan_announcements for select to anon,authenticated using(published);
create policy published_schedule on public.elan_schedule for select to anon,authenticated using(published);
create policy published_guests on public.elan_guests for select to anon,authenticated using(published);
create function public.elan_rate_check(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer; begin
 insert into public.elan_rate_limits as r(key,window_start,hits) values(p_key,now(),1)
 on conflict(key) do update set hits=case when r.window_start<now()-make_interval(secs=>p_seconds) then 1 else r.hits+1 end,
 window_start=case when r.window_start<now()-make_interval(secs=>p_seconds) then now() else r.window_start end returning hits into n;
 return n<=p_limit;
end $$;
create function public.elan_create_registration(p_user uuid,p_request uuid,p_edition text,p_kind text,p_school text,p_name text,p_phone text,p_attendees jsonb,p_terms text,p_consent boolean) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.elan_registration_settings; r uuid; n integer; used integer; a jsonb; begin
 select id into r from public.elan_registrations where owner_id=p_user and request_key=p_request;
 if r is not null then return r; end if;
 select * into s from public.elan_registration_settings where edition_slug=p_edition for update;
 if not found or not s.registration_open or (s.registration_closes_at is not null and s.registration_closes_at<=now()) then raise exception 'Registration is closed'; end if;
 if not exists(select 1 from public.elan_editions where slug=p_edition and published and status='upcoming') then raise exception 'Edition unavailable'; end if;
 if p_consent is distinct from true or p_terms<>s.terms_version then raise exception 'Please review the current participation terms'; end if;
 n=jsonb_array_length(p_attendees);
 if n<1 or n>50 or (p_kind='individual' and n<>1) then raise exception 'Invalid delegation size'; end if;
 select coalesce(sum(participant_count),0) into used from public.elan_registrations where edition_slug=p_edition and status<>'cancelled';
 if used+n>s.capacity then raise exception 'Not enough places remain'; end if;
 for a in select value from jsonb_array_elements(p_attendees) loop
 if (a->>'age')::integer not between s.min_age and s.max_age then raise exception 'Participant outside edition age range'; end if;
 end loop;
 insert into public.elan_registrations(owner_id,request_key,edition_slug,kind,school,coordinator_name,phone,participant_count,amount_paise,terms_version,terms_text,consent_confirmed)
 values(p_user,p_request,p_edition,p_kind,p_school,p_name,p_phone,n,s.price_paise*n,s.terms_version,s.terms_text,true) returning id into r;
 insert into public.elan_attendees(registration_id,full_name,age,grade) select r,value->>'full_name',(value->>'age')::integer,value->>'grade' from jsonb_array_elements(p_attendees);
 return r;
end $$;
create function public.elan_capture_payment(p_order text,p_payment text,p_amount integer,p_currency text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare p public.elan_payments; begin
 select * into p from public.elan_payments where order_id=p_order for update;
 if not found or p.amount_paise<>p_amount or p.currency<>p_currency then raise exception 'Payment does not match the stored order'; end if;
 if p.status='captured' then return p.payment_id=p_payment; end if;
 if p.status='refunded' then return false; end if;
 update public.elan_payments set status='captured',payment_id=p_payment,updated_at=now() where id=p.id;
 update public.elan_registrations set status='confirmed' where id=p.registration_id and status='pending';
 return true;
end $$;
revoke all on function public.elan_rate_check(text,integer,integer),public.elan_create_registration(uuid,uuid,text,text,text,text,text,jsonb,text,boolean),public.elan_capture_payment(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.elan_rate_check(text,integer,integer),public.elan_create_registration(uuid,uuid,text,text,text,text,text,jsonb,text,boolean),public.elan_capture_payment(text,text,integer,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('elan-submissions','elan-submissions',false,10485760,array['application/pdf']),
 ('elan-public-media','elan-public-media',true,8388608,array['image/jpeg','image/png','image/webp']);
-- No public or authenticated storage write policies. Edge API issues scoped signed upload URLs.
commit;
