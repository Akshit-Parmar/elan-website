-- ============================================================================
-- Élan 2026 — Participant Portal (0002_participant_portal.sql)
-- ----------------------------------------------------------------------------
-- Adds the paid-participant portal ON TOP OF the existing public intake schema
-- (0001_init.sql). It does NOT touch registrations, orders, ticket_types, or
-- any existing table's structure — it only references them by foreign key.
--
-- SECURITY MODEL (different from 0001 on purpose):
--   * 0001 tables are public INTAKE: anon may INSERT, never read.
--   * These portal tables are PRIVATE: anon gets NOTHING. Only an authenticated
--     Supabase Auth user who owns a PAID participant row can read portal
--     content. Participant rows are created ONLY by the service_role (the
--     issue-participant Edge Function) after payment is verified server-side.
--   * auth.uid() is used directly here because the portal uses native Supabase
--     Auth email/password — so auth.uid() resolves correctly (unlike a Firebase
--     JWT bridge). This is intentional.
--
-- Idempotent: safe to re-run. Every policy is dropped-if-exists first.
-- Run once in the Supabase SQL Editor or via `supabase db push`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. participant_uid sequence + generator  ->  ELAN26-0001, ELAN26-0002, ...
--    The UID is minted exactly once, at INSERT, and is then immutable.
-- ---------------------------------------------------------------------------
create sequence if not exists public.participant_uid_seq
  start with 1 increment by 1 minvalue 1 no maxvalue cache 1;

create or replace function public.next_participant_uid()
returns text
language sql
volatile
as $$
  select 'ELAN26-' || lpad(nextval('public.participant_uid_seq')::text, 4, '0');
$$;

-- ---------------------------------------------------------------------------
-- 2. participants  — the official paid-participant identity
--    Linked to the EXISTING registrations / orders rows (no duplication).
-- ---------------------------------------------------------------------------
create table if not exists public.participants (
  id                     uuid primary key default gen_random_uuid(),
  auth_user_id           uuid unique references auth.users(id) on delete set null,
  registration_id        uuid references public.registrations(id) on delete set null,
  order_id               uuid references public.orders(id)        on delete set null,
  participant_uid        text unique not null default public.next_participant_uid(),
  full_name              text not null,
  email                  text not null,
  phone                  text,
  school                 text,
  ticket_type            text,
  payment_status         text not null default 'paid'
                           check (payment_status in ('paid','confirmed','cancelled')),
  check_in_status        text not null default 'not_checked_in'
                           check (check_in_status in ('not_checked_in','checked_in')),
  -- Optional profile-only fields (participant may edit these; see UPDATE policy)
  emergency_contact      text,
  dietary_preference     text,
  accommodation_required boolean,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One participant per registration (idempotent issuance: never a second UID
-- for the same paid registration). Partial unique index tolerates NULLs.
create unique index if not exists participants_registration_uidx
  on public.participants (registration_id) where registration_id is not null;
create unique index if not exists participants_order_uidx
  on public.participants (order_id) where order_id is not null;
create index if not exists participants_email_idx on public.participants (lower(email));

-- ---------------------------------------------------------------------------
-- 3. Immutability guard: UID / email / payment_status / ticket_type cannot be
--    changed by anyone through normal UPDATEs (protects identity + money state).
-- ---------------------------------------------------------------------------
create or replace function public.participants_protect_immutable()
returns trigger language plpgsql as $$
begin
  if new.participant_uid is distinct from old.participant_uid then
    raise exception 'participant_uid is immutable';
  end if;
  if new.email is distinct from old.email then
    raise exception 'email is immutable via this path';
  end if;
  if new.payment_status is distinct from old.payment_status then
    raise exception 'payment_status may only change via service_role';
  end if;
  if new.ticket_type is distinct from old.ticket_type then
    raise exception 'ticket_type is immutable via this path';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_participants_immutable on public.participants;
create trigger trg_participants_immutable
  before update on public.participants
  for each row execute function public.participants_protect_immutable();
-- NOTE: this trigger fires for everyone, including service_role. The Edge
-- Function updates payment_status by running a small `security definer` RPC
-- (below) that is allowed to bypass it. Ordinary authenticated UPDATEs (the
-- Profile page) can still change phone / emergency_contact / dietary /
-- accommodation, but the four locked columns will raise if touched.

-- Service-role-only helper so the Edge Function can set payment_status safely.
create or replace function public.admin_set_payment_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.participants set payment_status = p_status, updated_at = now()
  where id = p_id;
end;
$$;
revoke all on function public.admin_set_payment_status(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Portal content tables
-- ---------------------------------------------------------------------------
create table if not exists public.portal_announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  audience     text not null default 'all',
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.portal_schedule_items (
  id           uuid primary key default gen_random_uuid(),
  day          integer not null,               -- 1 or 2
  start_time   time,
  end_time     time,
  title        text not null,
  description  text,
  location     text,
  category     text,                           -- briefing | flagship | meal | cultural | ...
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.participant_documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  file_url     text,
  audience     text not null default 'all',
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  team_name  text not null,
  school     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  role           text,
  created_at     timestamptz not null default now(),
  unique (team_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.participants          enable row level security;
alter table public.portal_announcements  enable row level security;
alter table public.portal_schedule_items enable row level security;
alter table public.participant_documents enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;

-- Reusable predicate: is the CURRENT auth user an ACTIVE (paid) participant?
create or replace function public.is_active_participant()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.participants p
    where p.auth_user_id = auth.uid()
      and p.payment_status in ('paid','confirmed')
  );
$$;

-- participants: a user reads ONLY their own row, and only if paid.
drop policy if exists participants_select_own on public.participants;
create policy participants_select_own on public.participants
  for select to authenticated
  using ( auth_user_id = auth.uid() and payment_status in ('paid','confirmed') );

-- participants: a user may UPDATE their own row (immutability trigger blocks the
-- four locked columns; only phone / emergency_contact / dietary / accommodation
-- effectively change).
drop policy if exists participants_update_own on public.participants;
create policy participants_update_own on public.participants
  for update to authenticated
  using ( auth_user_id = auth.uid() )
  with check ( auth_user_id = auth.uid() );
-- No INSERT/DELETE policy for anon or authenticated => only service_role
-- (the Edge Function) can create participant rows. That is the whole point:
-- the frontend can NEVER mint a paid participant.

-- Portal content: readable only by active paid participants, published rows only.
drop policy if exists announcements_select on public.portal_announcements;
create policy announcements_select on public.portal_announcements
  for select to authenticated
  using ( is_published and public.is_active_participant() );

drop policy if exists schedule_select on public.portal_schedule_items;
create policy schedule_select on public.portal_schedule_items
  for select to authenticated
  using ( is_published and public.is_active_participant() );

drop policy if exists documents_select on public.participant_documents;
create policy documents_select on public.participant_documents
  for select to authenticated
  using ( is_published and public.is_active_participant() );

-- Teams: a participant sees their own team + its members.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated
  using ( exists (
    select 1 from public.team_members tm
    join public.participants p on p.id = tm.participant_id
    where tm.team_id = teams.id and p.auth_user_id = auth.uid()
  ) );

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using ( exists (
    select 1 from public.team_members me
    join public.participants p on p.id = me.participant_id
    where me.team_id = team_members.team_id and p.auth_user_id = auth.uid()
  ) );

-- ---------------------------------------------------------------------------
-- 6. Grants (Supabase's May-2026 Data API change requires explicit grants).
--    anon gets NOTHING on any portal table. authenticated gets read + the one
--    self-update; RLS scopes every row. service_role bypasses RLS entirely.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select                     on public.participants          to authenticated;
grant update                     on public.participants          to authenticated;
grant select                     on public.portal_announcements  to authenticated;
grant select                     on public.portal_schedule_items to authenticated;
grant select                     on public.participant_documents to authenticated;
grant select                     on public.teams                 to authenticated;
grant select                     on public.team_members          to authenticated;
grant execute on function public.is_active_participant()          to authenticated;

-- Explicitly ensure anon is locked out of everything added here.
revoke all on public.participants          from anon;
revoke all on public.portal_announcements  from anon;
revoke all on public.portal_schedule_items from anon;
revoke all on public.participant_documents from anon;
revoke all on public.teams                 from anon;
revoke all on public.team_members          from anon;

-- ============================================================================
-- End 0002_participant_portal.sql
-- ============================================================================
