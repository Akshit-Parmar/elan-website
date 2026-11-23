-- Private, append-only interview outcomes. Existing applications and emails are unchanged.
begin;
create table public.elan_interview_outcomes (
 id uuid primary key default gen_random_uuid(),
 enquiry_id uuid not null references public.elan_enquiries(id) on delete cascade,
 interview_at timestamptz not null,
 outcome text not null check(outcome in ('completed','no_show','reschedule','pending')),
 note text not null check(length(trim(note)) between 1 and 2000),
 actor uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index interview_outcomes_application on public.elan_interview_outcomes(enquiry_id,created_at desc);
alter table public.elan_interview_outcomes enable row level security;
revoke all on public.elan_interview_outcomes from public,anon,authenticated;
grant select on public.elan_interview_outcomes to authenticated;
grant insert(enquiry_id,interview_at,outcome,note) on public.elan_interview_outcomes to authenticated;
create policy outcomes_read on public.elan_interview_outcomes for select to authenticated using((select elan_private.recruitment_manager()));
create policy outcomes_record on public.elan_interview_outcomes for insert to authenticated with check(
 (select elan_private.recruitment_manager()) and actor=(select auth.uid())
 and exists(select 1 from public.elan_oc_recruitment r where r.enquiry_id=elan_interview_outcomes.enquiry_id and r.stage='interview' and r.interview_published and r.interview_at=elan_interview_outcomes.interview_at)
 and (outcome not in ('completed','no_show') or interview_at<=now())
);
commit;
