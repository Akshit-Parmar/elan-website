-- Existing-project additive upgrade. Run once after APPLICANT-PORTAL.md upgrades.
-- No backfill: installing this does not email previous applicants.
begin;
alter table public.elan_oc_recruitment drop constraint elan_oc_recruitment_stage_check;
alter table public.elan_oc_recruitment add constraint elan_oc_recruitment_stage_check check(stage in ('new','under_review','shortlisted','interview','waitlisted','selected','not_selected'));
create table public.elan_application_mail (
 id uuid primary key default gen_random_uuid(),
 enquiry_id uuid not null references public.elan_enquiries(id) on delete cascade,
 event_key text not null unique, kind text not null,
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','uncertain','cancelled')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(), attempted_at timestamptz, sent_at timestamptz,
 provider_id text, error_code text
);
create index application_mail_pending on public.elan_application_mail(available_at) where status in ('pending','failed');
alter table public.elan_application_mail enable row level security;
revoke all on public.elan_application_mail from public,anon,authenticated;
grant select on public.elan_application_mail to authenticated;
grant all on public.elan_application_mail to service_role;
create policy application_mail_admin on public.elan_application_mail for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));

-- Deliberately excludes private notes, private interview details and application answers.
create function elan_private.application_mail_snapshot(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',e.id,'name',e.full_name,'email',e.email,'stage',r.stage,
 'department',case when r.stage='selected' then coalesce((select m.department from public.elan_oc_members_2027 m where m.email=lower(trim(e.email)) limit 1),e.details->>'department') else e.details->>'department' end,
 'message',r.applicant_message,
 'interview_at',case when r.stage='interview' and r.interview_published then r.interview_at end,
 'instructions',case when r.stage='interview' and r.interview_published then r.interview_instructions else '' end,
 'reply',case when r.stage='interview' and r.interview_published then r.interview_reply else '' end)
 from public.elan_enquiries e join public.elan_oc_recruitment r on r.enquiry_id=e.id
 where e.id=p_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')
$$;
create function elan_private.queue_application_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment; snap jsonb; k text; priority integer:=0; old_stage text;
begin
 select * into r from public.elan_oc_recruitment where enquiry_id=new.enquiry_id;
 if not found then return null;end if;
 snap:=elan_private.application_mail_snapshot(new.enquiry_id);
 if snap is null then return null;end if;
 old_stage:=case when tg_op='INSERT' then 'new' else old.stage end;
 if old_stage is distinct from r.stage then k:=r.stage;priority:=30;end if;
 if r.stage='interview' and r.interview_published and r.interview_at>now() and
 (tg_op='INSERT' or not old.interview_published or old.stage<>'interview' or old.interview_at is distinct from r.interview_at or old.interview_instructions is distinct from r.interview_instructions) then
 k:=case when tg_op='UPDATE' and old.stage='interview' and old.interview_published then 'interview_changed' else 'interview_invitation' end;priority:=40;
 elsif tg_op='UPDATE' and old.stage='interview' and old.interview_published and r.stage='interview' and not r.interview_published then k:='interview_cancelled';priority:=40;
 end if;
 if priority=0 and tg_op='UPDATE' and old.interview_reply is distinct from r.interview_reply and r.stage='interview' and r.interview_published and r.interview_reply<>'' then k:='reply_'||r.interview_reply;priority:=20;end if;
 if priority=0 and tg_op='UPDATE' and old.applicant_message is distinct from r.applicant_message and length(trim(r.applicant_message))>0 then k:='update';priority:=10;end if;
 if priority=0 then return null;end if;
 -- Deferred triggers see the final transaction state. One email per review version,
 -- even though saving a review updates the row twice.
 insert into public.elan_application_mail(enquiry_id,event_key,kind,payload)
 values(r.enquiry_id,r.enquiry_id||':review:'||r.version,k,snap||jsonb_build_object('priority',priority))
 on conflict(event_key) do update set kind=excluded.kind,payload=excluded.payload
 where elan_application_mail.status='pending' and (elan_application_mail.payload->>'priority')::integer < priority;
 return null;
end $$;
create constraint trigger queue_application_mail after insert or update on public.elan_oc_recruitment deferrable initially deferred for each row execute function elan_private.queue_application_mail();

create function public.elan_claim_application_mail(p_id uuid default null) returns setof public.elan_application_mail language plpgsql security definer set search_path='' as $$
begin
 -- A timed-out SMTP request may have been accepted. Never silently resend it.
 update public.elan_application_mail set status='uncertain',error_code='delivery_unknown' where status='sending' and attempted_at<now()-interval '10 minutes';
 -- One 24-hour reminder per published interview time, only while confirmation is outstanding.
 insert into public.elan_application_mail(enquiry_id,event_key,kind,payload)
 select r.enquiry_id,r.enquiry_id||':reminder:'||r.interview_at,'interview_reminder',elan_private.application_mail_snapshot(r.enquiry_id)||jsonb_build_object('priority',10)
 from public.elan_oc_recruitment r where r.stage='interview' and r.interview_published and r.interview_reply=''
 and r.interview_at>now()+interval '1 hour' and r.interview_at<=now()+interval '24 hours'
 and (p_id is null or r.enquiry_id=p_id)
 and exists(select 1 from public.elan_application_mail m where m.enquiry_id=r.enquiry_id and m.kind in ('interview_invitation','interview_changed') and m.status='sent' and (m.payload->>'interview_at')::timestamptz=r.interview_at and m.sent_at<now()-interval '30 minutes')
 on conflict(event_key) do nothing;
 -- Superseded decisions, withdrawn invitations and deleted applications must not leak stale updates.
 update public.elan_application_mail m set status='cancelled',error_code='superseded'
 where m.status in ('pending','failed') and (p_id is null or m.enquiry_id=p_id)
 and ((m.payload-'priority') is distinct from elan_private.application_mail_snapshot(m.enquiry_id)
 or (m.kind in ('interview_invitation','interview_changed','interview_reminder') and (m.payload->>'interview_at')::timestamptz<=now()));
 return query with picked as (
 select m.id from public.elan_application_mail m where m.status in ('pending','failed') and m.attempts<5 and m.available_at<=now()
 and (p_id is null or m.enquiry_id=p_id) order by m.created_at for update skip locked limit 5
 ) update public.elan_application_mail m set status='sending',attempts=m.attempts+1,attempted_at=now(),error_code=null
 from picked where m.id=picked.id returning m.*;
end $$;
create function public.elan_application_mail_current(p_mail uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.elan_application_mail m where m.id=p_mail and m.status='sending'
 and (m.payload-'priority')=elan_private.application_mail_snapshot(m.enquiry_id)
 and (m.kind not in ('interview_invitation','interview_changed','interview_reminder') or (m.payload->>'interview_at')::timestamptz>now()))
$$;
revoke all on function public.elan_application_mail_current(uuid) from public,anon,authenticated;
grant execute on function public.elan_application_mail_current(uuid) to service_role;
revoke all on function elan_private.application_mail_snapshot(uuid),elan_private.queue_application_mail(),public.elan_claim_application_mail(uuid) from public,anon,authenticated;
grant execute on function elan_private.application_mail_snapshot(uuid),public.elan_claim_application_mail(uuid) to service_role;
commit;
