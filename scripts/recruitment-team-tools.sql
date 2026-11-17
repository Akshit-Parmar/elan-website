-- Additive upgrade after leadership-recruitment.sql and worker activation.
begin;
create table public.elan_review_assignments (
 enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,
 owner_id uuid references auth.users(id) on delete set null,
 due_at timestamptz,
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.elan_review_scorecards (
 enquiry_id uuid references public.elan_enquiries(id) on delete cascade,
 reviewer_id uuid references auth.users(id) on delete cascade,
 fit integer not null check(fit between 1 and 5),
 communication integer not null check(communication between 1 and 5),
 reliability integer not null check(reliability between 1 and 5),
 initiative integer not null check(initiative between 1 and 5),
 evidence text not null check(length(trim(evidence)) between 1 and 4000),
 recommendation text not null check(recommendation in ('Proceed','Discuss','Do not proceed')),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(enquiry_id,reviewer_id)
);
create index elan_review_assignments_owner on public.elan_review_assignments(owner_id);
create index elan_review_scorecards_reviewer on public.elan_review_scorecards(reviewer_id);
alter table public.elan_review_assignments enable row level security;
alter table public.elan_review_scorecards enable row level security;
revoke all on public.elan_review_assignments,public.elan_review_scorecards from public,anon,authenticated;
grant select on public.elan_review_assignments,public.elan_review_scorecards to authenticated;
create policy recruitment_read on public.elan_review_assignments for select to authenticated using((select elan_private.recruitment_manager()));
create policy recruitment_read on public.elan_review_scorecards for select to authenticated using((select elan_private.recruitment_manager()));
create function elan_private.review_team() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(r.label,''),u.email),'role',coalesce(r.seat,'admin'))),'[]') from auth.users u left join public.elan_oc_reviewers r on r.user_id=u.id where u.email_confirmed_at is not null and u.deleted_at is null and (r.user_id is not null or exists(select 1 from public.elan_staff s where s.user_id=u.id and s.role='admin')));
end $$;
create function elan_private.save_review_assignment(p_id uuid,p_owner uuid,p_due timestamptz,p_expected integer) returns public.elan_review_assignments language plpgsql security definer set search_path='' as $$
declare result public.elan_review_assignments;
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 if not exists(select 1 from public.elan_enquiries where id=p_id and (details->>'application_version'='2' or details->>'intent'='2027 organising committee application')) then raise exception 'OC application not found';end if;
 if p_owner is not null and not exists(select 1 from jsonb_array_elements(elan_private.review_team()) t where t->>'id'=p_owner::text) then raise exception 'Choose a current recruitment reviewer';end if;
 perform pg_advisory_xact_lock(hashtextextended('assignment:'||p_id,0));
 if p_expected is null or coalesce((select version from public.elan_review_assignments where enquiry_id=p_id),0)<>p_expected then raise exception 'Assignment changed. Reload before saving.';end if;
 insert into public.elan_review_assignments(enquiry_id,owner_id,due_at) values(p_id,p_owner,p_due) on conflict(enquiry_id) do update set owner_id=excluded.owner_id,due_at=excluded.due_at,version=elan_review_assignments.version+1,updated_at=now() returning * into result;
 return result;
end $$;
create function elan_private.save_review_scorecard(p_id uuid,p_fit integer,p_communication integer,p_reliability integer,p_initiative integer,p_evidence text,p_recommendation text,p_expected integer) returns public.elan_review_scorecards language plpgsql security definer set search_path='' as $$
declare result public.elan_review_scorecards;
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 if not exists(select 1 from public.elan_enquiries where id=p_id and (details->>'application_version'='2' or details->>'intent'='2027 organising committee application')) then raise exception 'OC application not found';end if;
 perform pg_advisory_xact_lock(hashtextextended('score:'||p_id||auth.uid(),0));
 if p_expected is null or coalesce((select version from public.elan_review_scorecards where enquiry_id=p_id and reviewer_id=auth.uid()),0)<>p_expected then raise exception 'Scorecard changed. Reload before saving.';end if;
 insert into public.elan_review_scorecards(enquiry_id,reviewer_id,fit,communication,reliability,initiative,evidence,recommendation) values(p_id,auth.uid(),p_fit,p_communication,p_reliability,p_initiative,p_evidence,p_recommendation) on conflict(enquiry_id,reviewer_id) do update set fit=excluded.fit,communication=excluded.communication,reliability=excluded.reliability,initiative=excluded.initiative,evidence=excluded.evidence,recommendation=excluded.recommendation,version=elan_review_scorecards.version+1,updated_at=now() returning * into result;
 return result;
end $$;
create function public.elan_review_team() returns jsonb language sql security invoker set search_path='' as $$select elan_private.review_team()$$;
create function public.elan_save_review_assignment(p_id uuid,p_owner uuid,p_due timestamptz,p_expected integer) returns public.elan_review_assignments language sql security invoker set search_path='' as $$select elan_private.save_review_assignment(p_id,p_owner,p_due,p_expected)$$;
create function public.elan_save_review_scorecard(p_id uuid,p_fit integer,p_communication integer,p_reliability integer,p_initiative integer,p_evidence text,p_recommendation text,p_expected integer) returns public.elan_review_scorecards language sql security invoker set search_path='' as $$select elan_private.save_review_scorecard(p_id,p_fit,p_communication,p_reliability,p_initiative,p_evidence,p_recommendation,p_expected)$$;
revoke all on function elan_private.review_team(),public.elan_review_team(),elan_private.save_review_assignment(uuid,uuid,timestamptz,integer),public.elan_save_review_assignment(uuid,uuid,timestamptz,integer),elan_private.save_review_scorecard(uuid,integer,integer,integer,integer,text,text,integer),public.elan_save_review_scorecard(uuid,integer,integer,integer,integer,text,text,integer) from public,anon;
grant execute on function elan_private.review_team(),public.elan_review_team(),elan_private.save_review_assignment(uuid,uuid,timestamptz,integer),public.elan_save_review_assignment(uuid,uuid,timestamptz,integer),elan_private.save_review_scorecard(uuid,integer,integer,integer,integer,text,text,integer),public.elan_save_review_scorecard(uuid,integer,integer,integer,integer,text,text,integer) to authenticated;
-- Claim one digest per administrator per day. No applicant data is put in alerts.
create table elan_private.mail_alert_claims (user_id uuid references auth.users(id) on delete cascade, day date, claimed_at timestamptz not null default now(), primary key(user_id,day));
alter table elan_private.mail_alert_claims enable row level security;
revoke all on elan_private.mail_alert_claims from public,anon,authenticated;
create function public.elan_claim_mail_alerts() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; issues integer;
begin
 select count(*) into issues from public.elan_application_mail where status in ('failed','uncertain') or (status='pending' and created_at<now()-interval '30 minutes');
 issues:=issues+(select count(*) from public.elan_acknowledgements where status in ('failed','unconfigured'));
 if issues=0 then return '[]'::jsonb;end if;
 with claimed as (insert into elan_private.mail_alert_claims(user_id,day) select s.user_id,(now() at time zone 'Asia/Kolkata')::date from public.elan_staff s join auth.users u on u.id=s.user_id where s.role='admin' and u.deleted_at is null and u.email_confirmed_at is not null on conflict do nothing returning user_id)
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'count',issues,'day',(now() at time zone 'Asia/Kolkata')::date)),'[]') into result from claimed c join auth.users u on u.id=c.user_id;
 return result;
end $$;
revoke all on function public.elan_claim_mail_alerts() from public,anon,authenticated;
grant execute on function public.elan_claim_mail_alerts() to service_role;
commit;
