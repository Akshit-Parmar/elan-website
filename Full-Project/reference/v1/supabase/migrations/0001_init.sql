-- ============================================================================
-- Élan — schema (0001_init.sql)  ·  LEAN BUILD
-- ----------------------------------------------------------------------------
-- Nine tables, covering the two goals: an elegant, informative site and selling
-- tickets. Future-phase tables (content CMS, Crisis Command, back-office ops)
-- were removed to keep the database clean. They can be re-added later from the
-- archived full schema if the event ever scales up.
--
-- Safe to run once on a fresh Supabase project (SQL Editor or `supabase db push`).
--
-- SECURITY MODEL — three tiers:
--   1. PUBLIC INSERT — the site may create rows, never read them.
--        registrations, contact_messages, school_inquiries, volunteer_applications
--   2. PUBLIC READ   — the site may read these (published/active) rows.
--        editions, site_settings, ticket_types
--   3. LOCKED        — no browser access; server-side (Edge Functions) only.
--        orders, tickets
--
-- Row Level Security is ON for every table. The anon (public) key is only ever
-- as powerful as the policies below allow. Keep the service_role key server-side.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — FOUNDATION
-- ============================================================================

-- editions ------------------------------------------------------------------
-- The spine. Every other table carries edition_id so each year's data stays
-- cleanly partitioned and comparable across editions.
create table if not exists public.editions (
  year        integer primary key,                 -- e.g. 2026
  name        text not null,                        -- "Élan 2026"
  director    text,
  venue       text,
  starts_on   date,
  ends_on     date,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- At most one "current" edition.
create unique index if not exists uniq_editions_current
  on public.editions (is_current) where is_current;

-- site_settings -------------------------------------------------------------
-- Key/value config so the OC can change the countdown date, venue, contact
-- details, etc. without a code deploy. is_public gates what the browser can read.
create table if not exists public.site_settings (
  key         text primary key,
  value       text,
  is_public   boolean not null default false,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ============================================================================
-- SECTION 2 — COMMERCE CATALOG
-- ============================================================================

-- ticket_types --------------------------------------------------------------
-- The trusted price catalog. This is the source of truth for ticket amounts;
-- the server recomputes order amounts from here (never from the browser).
create table if not exists public.ticket_types (
  id             uuid primary key default gen_random_uuid(),
  edition_id     integer not null references public.editions(year),
  name           text not null,
  slug           text,
  price_inr      integer not null check (price_inr >= 0),
  description    text,
  sales_start    timestamptz,
  sales_end      timestamptz,
  quantity_total integer,                            -- null = unlimited
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (edition_id, name)
);
create index if not exists idx_ticket_types_edition on public.ticket_types (edition_id);


-- ============================================================================
-- SECTION 3 — PUBLIC INTAKE  (Tier 1: public insert)
-- ============================================================================

-- registrations -------------------------------------------------------------
-- The lead capture from tickets.html. Payment is NOT stored here — it lives in
-- `orders`. ticket_type is kept as a text label that the form writes.
create table if not exists public.registrations (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  edition_id     integer not null default 2026 references public.editions(year),
  full_name      text not null,
  email          text not null,
  phone          text not null,
  school         text not null,
  ticket_type    text not null,                      -- label snapshot, e.g. "Premium Pass · ₹3,499"
  quantity       integer not null default 1 check (quantity between 1 and 50),
  unit_amount    integer,                            -- INR, advisory (parsed client-side)
  amount         integer,                            -- unit_amount * quantity, advisory
  notes          text,
  consent        boolean not null default false,
  status         text not null default 'pending'
                 check (status in ('pending','contacted','paid','cancelled'))
);
create index if not exists idx_registrations_created on public.registrations (created_at desc);
create index if not exists idx_registrations_edition on public.registrations (edition_id);
create index if not exists idx_registrations_status  on public.registrations (status);

-- contact_messages ----------------------------------------------------------
create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  edition_id   integer default 2026 references public.editions(year),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  inquiry_type text not null,
  message      text not null,
  status       text not null default 'new'
               check (status in ('new','in_progress','resolved'))
);
create index if not exists idx_contact_created on public.contact_messages (created_at desc);

-- school_inquiries ----------------------------------------------------------
create table if not exists public.school_inquiries (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  edition_id         integer default 2026 references public.editions(year),
  school_name        text not null,
  coordinator_name   text not null,
  coordinator_email  text not null,
  coordinator_phone  text not null,
  estimated_students integer check (estimated_students between 1 and 300),
  interest           text not null,
  notes              text,
  status             text not null default 'new'
                     check (status in ('new','in_progress','confirmed','declined'))
);
create index if not exists idx_schools_created on public.school_inquiries (created_at desc);

-- volunteer_applications ----------------------------------------------------
create table if not exists public.volunteer_applications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  edition_id  integer default 2026 references public.editions(year),
  full_name   text not null,
  email       text not null,
  phone       text not null,
  school      text not null,
  role        text not null,
  commitment  text not null,
  motivation  text not null,
  status      text not null default 'new'
              check (status in ('new','shortlisted','accepted','declined'))
);
create index if not exists idx_volunteers_created on public.volunteer_applications (created_at desc);


-- ============================================================================
-- SECTION 4 — COMMERCE  (Tier 3: locked, server-side only)
-- ============================================================================

-- orders --------------------------------------------------------------------
-- One row per payment transaction. amount_inr is computed server-side from
-- ticket_types. Razorpay fields are filled by the Edge Function / webhook.
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  edition_id          integer not null references public.editions(year),
  registration_id     uuid references public.registrations(id),
  buyer_name          text,
  buyer_email         text,
  buyer_phone         text,
  amount_inr          integer not null check (amount_inr >= 0),
  currency            text not null default 'INR',
  status              text not null default 'created'
                      check (status in ('created','paid','failed','refunded','cancelled')),
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  razorpay_signature  text,
  paid_at             timestamptz
);
create index if not exists idx_orders_edition      on public.orders (edition_id);
create index if not exists idx_orders_registration on public.orders (registration_id);
create index if not exists idx_orders_status       on public.orders (status);

-- tickets -------------------------------------------------------------------
-- One issued pass per attendee. qr_token drives event-day check-in scanning.
create table if not exists public.tickets (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  edition_id     integer not null references public.editions(year),
  order_id       uuid references public.orders(id),
  ticket_type_id uuid references public.ticket_types(id),
  attendee_name  text,
  attendee_email text,
  qr_token       text not null unique default gen_random_uuid()::text,
  status         text not null default 'issued'
                 check (status in ('issued','checked_in','void')),
  checked_in_at  timestamptz
);
create index if not exists idx_tickets_order   on public.tickets (order_id);
create index if not exists idx_tickets_edition on public.tickets (edition_id);


-- ============================================================================
-- SECTION 5 — updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'editions','site_settings','ticket_types','registrations','contact_messages',
    'school_inquiries','volunteer_applications','orders','tickets'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s
                    for each row execute function public.set_updated_at();', t);
  end loop;
end $$;


-- ============================================================================
-- SECTION 6 — ROW LEVEL SECURITY  (enable on ALL tables)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'editions','site_settings','ticket_types','registrations','contact_messages',
    'school_inquiries','volunteer_applications','orders','tickets'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Tier 1 — PUBLIC INSERT (no select/update/delete => cannot be read back) ----
drop policy if exists "public insert registrations" on public.registrations;
create policy "public insert registrations" on public.registrations
  for insert to anon, authenticated with check (true);
drop policy if exists "public insert contact" on public.contact_messages;
create policy "public insert contact" on public.contact_messages
  for insert to anon, authenticated with check (true);
drop policy if exists "public insert schools" on public.school_inquiries;
create policy "public insert schools" on public.school_inquiries
  for insert to anon, authenticated with check (true);
drop policy if exists "public insert volunteers" on public.volunteer_applications;
create policy "public insert volunteers" on public.volunteer_applications
  for insert to anon, authenticated with check (true);

-- Tier 2 — PUBLIC READ (published/active rows only) --------------------------
drop policy if exists "public read editions" on public.editions;
create policy "public read editions" on public.editions
  for select to anon, authenticated using (true);
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select to anon, authenticated using (is_public = true);
drop policy if exists "public read ticket_types" on public.ticket_types;
create policy "public read ticket_types" on public.ticket_types
  for select to anon, authenticated using (active = true);

-- Tier 3 — LOCKED: no anon/authenticated policy for orders or tickets, so the
-- Data API cannot touch them. Reachable only via service_role (Edge Functions)
-- and the dashboard owner role.


-- ============================================================================
-- SECTION 7 — GRANTS  (scoped to match the RLS policies above)
-- ============================================================================
grant usage on schema public to anon, authenticated;

-- Tier 1: insert only
grant insert on
  public.registrations, public.contact_messages,
  public.school_inquiries, public.volunteer_applications
  to anon, authenticated;

-- Tier 2: select only
grant select on
  public.editions, public.site_settings, public.ticket_types
  to anon, authenticated;

-- Server-side role (Edge Functions / Workers) — full access, bypasses RLS.
grant all on all tables in schema public to service_role;


-- ============================================================================
-- SECTION 8 — SEED DATA
-- ============================================================================

-- The 2026 edition (mark as current).
insert into public.editions (year, name, director, venue, starts_on, ends_on, is_current)
values (2026, 'Élan 2026', 'Akshit Parmar', 'SGI Pune Campus, Pune, Maharashtra',
        '2026-09-05', '2026-09-06', true)
on conflict (year) do nothing;

-- Ticket catalog — mirrors the labels/prices and windows in tickets.html.
-- Cleared first so re-running this file always lands on exactly these four
-- (removes any stale tiers from an earlier version). Safe: no orders yet.
delete from public.ticket_types where edition_id = 2026;
insert into public.ticket_types (edition_id, name, price_inr, sort_order, sales_start, sales_end) values
  (2026, 'Early Bird',              3699, 1, '2026-07-12T00:00:00+05:30', '2026-07-26T00:00:00+05:30'),
  (2026, 'Standard',                4199, 2, '2026-07-26T00:00:00+05:30', '2026-08-15T00:00:00+05:30'),
  (2026, 'Late Registration',       4899, 3, '2026-08-15T00:00:00+05:30', '2026-08-24T00:00:00+05:30'),
  (2026, 'School Delegation Pack', 18999, 4, '2026-07-12T00:00:00+05:30', '2026-08-24T00:00:00+05:30');

-- Public settings the site can read (extend as needed).
insert into public.site_settings (key, value, is_public, description) values
  ('countdown_target', '2026-09-05T09:00:00+05:30', true, 'Hero + nav countdown target'),
  ('venue',            'SGI Pune Campus, Pune, Maharashtra', true, 'Displayed venue'),
  ('contact_email',    'elan@sgischool.in', true, 'Public contact email'),
  ('contact_phone',    '+91 8160215010', true, 'Public contact phone')
on conflict (key) do nothing;
