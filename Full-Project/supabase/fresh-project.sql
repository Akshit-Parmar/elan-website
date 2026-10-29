-- FRESH EMPTY PROJECT ONLY. Do not run on the existing hosted database.

-- scripts/content-schema.sql
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


-- supabase/migrations/20261023165141_application_backend.sql
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


-- supabase/migrations/20261023170041_backend_concurrency_guards.sql
begin;
create policy service_only on public.elan_audit for all to service_role using(true) with check(true);
create policy service_only on public.elan_enquiries for all to service_role using(true) with check(true);
create policy service_only on public.elan_rate_limits for all to service_role using(true) with check(true);
create function public.elan_claim_order(p_user uuid,p_registration uuid) returns public.elan_payments
language plpgsql security invoker set search_path='' as $$
declare r public.elan_registrations; p public.elan_payments;begin
 select * into r from public.elan_registrations where id=p_registration and owner_id=p_user for update;
 if not found or r.status<>'pending' or r.amount_paise<=0 then raise exception 'Registration not eligible for payment'; end if;
 select * into p from public.elan_payments where registration_id=r.id;
 if found then return p; end if;
 insert into public.elan_payments(registration_id,amount_paise) values(r.id,r.amount_paise) returning * into p;
 return p;
end $$;
create function public.elan_set_registration_status(p_id uuid,p_status text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare r public.elan_registrations;begin
 select * into r from public.elan_registrations where id=p_id for update;
 if not found or r.status<>'pending' then raise exception 'Only pending registrations can change status'; end if;
 if p_status='cancelled' then
 if exists(select 1 from public.elan_payments where registration_id=p_id) then raise exception 'Payment order exists; reconcile with provider first'; end if;
 elsif p_status='confirmed' then
 if r.amount_paise>0 and not exists(select 1 from public.elan_payments where registration_id=p_id and status='captured') then raise exception 'Captured payment required'; end if;
 else raise exception 'Unsupported status'; end if;
 update public.elan_registrations set status=p_status where id=p_id;
 return true;
end $$;
-- A token is used to claim a newly created payment row once, before provider calls.
alter table public.elan_payments add column processing_token uuid;
create function public.elan_lock_order(p_id uuid,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.elan_payments set processing_token=p_token where id=p_id and status='creating' and processing_token is null;
 return found;
end $$;
revoke all on function public.elan_claim_order(uuid,uuid),public.elan_set_registration_status(uuid,text),public.elan_lock_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.elan_claim_order(uuid,uuid),public.elan_set_registration_status(uuid,text),public.elan_lock_order(uuid,uuid) to service_role;
commit;


-- scripts/guest-seed.sql
insert into public.elan_guests(slug,edition_slug,name,role,position,bio,image_url,sort_order,published) values
('vinod-vidwans','2026','Prof. Vinod Vidwans','Chief Guest · Day 1','Professor, Faculty of Design, Art & Performance FLAME University, Pune','A designer, cognitive philosopher and portrait painter whose work brings creativity, technology and the arts into conversation.

Prof. Vinod Vidwans joined Élan’s first edition as the Chief Guest for Day 1. His academic and creative work spans design education, cognitive philosophy and research into artificial intelligence and Indian music.

At FLAME University, he previously chaired the School of Fine and Performing Arts. Before joining FLAME, he served as a Senior Designer (Professor) and Vice Chairman (Research) at the National Institute of Design, Ahmedabad, where he also headed New Media and Software User Interface Design.

His Creative Intelligent Expert System for Indian Music uses AI principles to generate a bandish —a musical composition—in a given raga and render it in a traditional classical style.

He holds a PhD in Cognitive Philosophy and a Master of Design from IIT Bombay, alongside a postgraduate degree in Fine Arts from Nagpur University. His doctoral research explores “Design Intelligence” and creativity from a holistic perspective.

His contributions include graphic-design textbook work with NCERT, academic advisory roles with IGNOU, and teaching or resource engagements at institutions including IIM Ahmedabad, IIT Kanpur, the Indian Institute of Science and the Central University of Hyderabad. He is also a recipient of a UGC Junior Research Fellowship in Fine Arts.','/assets/guests/vinod-vidwans.png',0,true),
('lav-gaikwad','2026','Hon. Lav Gaikwad','Chief Guest · Day 2','Education Extension Officer, Mulashi Zilla Parishad, Pune','An educator and administrator with 35 years of service in education, extending his work beyond the classroom into community awareness.

Hon. Lav Gaikwad’s career spans teaching, educational leadership and administration, including service as a Cluster Head and an Education Extension Officer. His work brings together the experience of a classroom teacher and the wider responsibilities of supporting education across a community.

He holds M.A. and M.Ed. qualifications. During his teaching career, he received a District-Level Best Teacher Award, and he has also received two national-level awards recognising his contributions to education and social development.

Alongside his professional responsibilities, he delivers lectures and guidance on social and educational issues, contributing to public awareness and community development.

He joined Élan Summit’s first edition in 2026 as the Chief Guest for Day 2.','/assets/guests/lav-gaikwad.jpg',1,true),
('bapurao-pawar','2026','Shri Bapurao Trimbak Pawar','Guest of Honor · Day 2','Educator · PM SHRI Zilla Parishad Primary School Lavale, Taluka Mulshi, District Pune','A primary educator and master trainer with more than three decades of teaching experience and a belief that every child can learn.

Shri Bapurao Trimbak Pawar began his teaching career in 1994. At PM SHRI Zilla Parishad Primary School, Lavale, his practice combines inclusive teaching, classroom technology and individual support for children who need additional help.

During the COVID-19 pandemic, he implemented “Ghar Tithe Abhyasika”—a study centre at every home—to help students continue learning. His classroom approach includes weekly assessments, analysis of each student’s progress and targeted teaching to address learning gaps.

A recipient of the Ideal Teacher Award, he has also served as a Master Trainer at village, taluka, district and state levels, supporting fellow teachers through training programmes, workshops and educational guidance.

He joined Élan Summit’s first edition in 2026 as the Guest of Honor for Day 2.','/assets/guests/bapurao-pawar.jpg',2,true),
('unnikrishnan-nair','2026','Unnikrishnan Nair','CENT$IBLE JUDGE','Founder & Creative Director Begaana Pictures','A production strategist with a creative vision and a practical understanding of what it takes to deliver it.

Unnikrishnan Nair is the founder of Begaana Pictures. His work across the Indian media landscape spans large-scale productions, complex logistics and the teams and infrastructure that bring ambitious projects to life.

With more than a decade of professional experience, he has developed production networks across India and internationally, working with broadcasters, streaming platforms, vendors and regional crews. After moving on from the CEO role, he continues to guide Begaana Pictures as Creative Director and executive mentor.

He served as a judge for Cent$ible at Élan Summit’s first edition in 2026.','/assets/guests/unnikrishnan-nair.jpg',3,true),
('rahul-kotha','2026','Rahul Kotha','CENT$IBLE JUDGE','CEO & Director Begaana Pictures','A filmmaker and business leader working at the meeting point of storytelling, creative production and commercial purpose.

Rahul Kotha leads Begaana Pictures as CEO and Director. Mentored by Unnikrishnan Nair, he works across character-driven streaming series, brand campaigns, animation and social-impact narratives.

His practice combines visual storytelling with hands-on production leadership, from directing multi-camera crews and collaborating with on-screen talent to exploring AI in music-video production. His work emphasises emotional sincerity, narrative clarity and a contemporary visual approach.

He served as a judge for Cent$ible at Élan Summit’s first edition in 2026.','/assets/guests/rahul-kotha.jpg',4,true),
('sasmita-mohanty','2026','Mrs. Sasmita Mohanty','SCHOOL LEADERSHIP & SUPPORT','Director-Principal Sanjay Ghodawat International School','An educator, school leader and teacher trainer with a career spanning more than three decades.

Mrs. Sasmita Mohanty is the Director-Principal of Sanjay Ghodawat International School. Her experience spans classroom teaching, school administration and institutional leadership, including earlier roles at Phoenix Public School in Belgaum, Sanjeevan Public School in Panhala and Presidency School in Bengaluru.

She holds M.A., M.Phil. and B.Ed. qualifications and has worked as a trainer and resource person for CBSE. At SGIS, her leadership has overseen major milestones, including the introduction of the Cambridge section in 2014 and the school’s IB authorisation in 2018.

For Élan, she represents the leadership of the school that organised its inaugural edition—connecting the summit’s student-led ambition with the institution behind it.','/assets/guests/sasmita-mohanty.png',5,true),
('devika-nair','2026','Ms. Devika Nair','Crisis Command Judge','Debater, MUN adjudicator & aspiring seafarer','An award-winning debater and Model United Nations adjudicator with experience in International Press, committee leadership and public speaking.

Devika Rajendrakumar Nair is pursuing studies in nautical sciences alongside an active involvement in debate and Model United Nations. Her adjudication experience includes leading International Press at CHMUN Bengaluru, The Kalyani School MUN, SGISMUN and Novus Model UN, as well as executive-board roles in committees focused on the status of women and counter-terrorism.

She received Best Debater recognition at the CISCE Inter School Debate Competition in 2022 and 2023. Her MUN honours include Best Journalist at BTC MUN and Vichaar MUN, and Best Delegate at DSK MUN. She has also served as Deputy Secretary General and Deputy Conference Director at Invictus Model United Nations.

She served as a judge for Crisis Command at Élan Summit’s first edition in 2026.','/assets/guests/devika-nair.jpg',6,true),
('shreeni-yelwande','2026','Ms. Shreeni Yelwande','Crisis Command Judge','MUN chair & conference organiser','A Model United Nations chair and organiser whose experience spans diplomacy, negotiation and the practical work of leading a committee.

Shreeni Yelwande has participated in 39 MUN conferences as a delegate and served on executive boards across a range of committees. Her chairing experience includes simulations of the UN Security Council, the Commission on the Status of Women, the Human Rights Council and the Economic and Social Council, alongside fictional and special-summit formats.

Her conference leadership includes secretariat roles at RISMUN, VLPMUN and MGYS, and service as Secretary General at Awaaz India Org. Her delegate honours include Best Delegate awards at IIMUN and Fairgaze MUN, as well as multiple High Commendations. With an interest in pursuing law, she brings a focus on analytical thinking, negotiation and debate to her MUN work.

She served as a judge for Crisis Command at Élan Summit’s first edition in 2026.','/assets/guests/shreeni-yelwande.jpg',7,true)
on conflict (slug) do update set edition_slug=excluded.edition_slug,name=excluded.name,role=excluded.role,position=excluded.position,bio=excluded.bio,image_url=excluded.image_url,sort_order=excluded.sort_order,published=excluded.published;
