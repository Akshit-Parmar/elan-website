-- Additive application tracking. Existing private interview notes stay private.
alter table public.elan_oc_recruitment drop constraint elan_oc_recruitment_stage_check;
alter table public.elan_oc_recruitment add constraint elan_oc_recruitment_stage_check check(stage in ('new','under_review','shortlisted','interview','selected','not_selected'));
alter table public.elan_oc_recruitment add column applicant_message text not null default '' check(length(applicant_message)<=2000), add column interview_published boolean not null default false, add column interview_instructions text not null default '' check(length(interview_instructions)<=2000), add column interview_reply text not null default '' check(interview_reply in ('','confirmed','reschedule')), add column interview_reply_note text not null default '' check(length(interview_reply_note)<=1000);
create function elan_private.save_application_review(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer,p_message text,p_published boolean,p_instructions text) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment; old_at timestamptz;old_instructions text;old_published boolean;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
 select interview_at,interview_instructions,interview_published into old_at,old_instructions,old_published from public.elan_oc_recruitment where enquiry_id=p_id;
 if p_published and (p_interview is null or length(trim(p_instructions))=0) then raise exception 'Add an interview time and applicant instructions before publishing';end if;
 r:=elan_private.save_recruitment(p_id,p_stage,p_notes,p_interview,p_details,p_expected);
 update public.elan_oc_recruitment set applicant_message=p_message,interview_published=p_published,interview_instructions=p_instructions,
 interview_reply=case when old_at is distinct from p_interview or old_instructions is distinct from p_instructions or old_published is distinct from p_published then '' else interview_reply end,
 interview_reply_note=case when old_at is distinct from p_interview or old_instructions is distinct from p_instructions or old_published is distinct from p_published then '' else interview_reply_note end
 where enquiry_id=p_id returning * into r;
 return r;
end $$;
create function public.elan_save_application_review(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer,p_message text,p_published boolean,p_instructions text) returns public.elan_oc_recruitment language sql security invoker set search_path='' as $$select elan_private.save_application_review(p_id,p_stage,p_notes,p_interview,p_details,p_expected,p_message,p_published,p_instructions)$$;
create function elan_private.my_applications() returns jsonb language plpgsql security definer set search_path='' as $$
declare em text;
begin
 select lower(email) into em from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if em is null then raise exception 'Sign in with a verified email';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'full_name',e.full_name,'created_at',e.created_at,'department',e.details->>'department','stage',coalesce(r.stage,'new'),'message',coalesce(r.applicant_message,''),'interview_at',case when r.interview_published and r.stage='interview' then r.interview_at end,'instructions',case when r.interview_published and r.stage='interview' then r.interview_instructions else '' end,'reply',r.interview_reply,'reply_note',r.interview_reply_note,'version',coalesce(r.version,0)) order by e.created_at desc) from public.elan_enquiries e left join public.elan_oc_recruitment r on r.enquiry_id=e.id where lower(e.email)=em and (e.details->>'intent'='2027 organising committee application' or e.details->>'application_version'='2')),'[]'::jsonb);
end $$;
create function public.elan_my_applications() returns jsonb language sql security invoker set search_path='' as $$select elan_private.my_applications()$$;
create function elan_private.interview_reply(p_id uuid,p_reply text,p_note text,p_expected integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.elan_enquiries e on lower(e.email)=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null and e.id=p_id and (e.details->>'intent'='2027 organising committee application' or e.details->>'application_version'='2')) then raise exception 'Application not found';end if;
 if p_reply not in ('confirmed','reschedule') or p_reply is null or p_note is null or length(p_note)>1000 or (p_reply='reschedule' and length(trim(p_note))<5) then raise exception 'Choose a response and include availability when requesting another time';end if;
 perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
 update public.elan_oc_recruitment set interview_reply=p_reply,interview_reply_note=p_note,version=version+1,updated_at=now() where enquiry_id=p_id and version=p_expected and stage='interview' and interview_published and interview_at>now();
 if not found then raise exception 'The invitation changed or has passed. Refresh and contact the team if needed.';end if;
end $$;
create function public.elan_interview_reply(p_id uuid,p_reply text,p_note text,p_expected integer) returns void language sql security invoker set search_path='' as $$select elan_private.interview_reply(p_id,p_reply,p_note,p_expected)$$;
revoke all on function elan_private.save_application_review(uuid,text,text,timestamptz,text,integer,text,boolean,text),public.elan_save_application_review(uuid,text,text,timestamptz,text,integer,text,boolean,text),elan_private.my_applications(),public.elan_my_applications(),elan_private.interview_reply(uuid,text,text,integer),public.elan_interview_reply(uuid,text,text,integer) from public,anon;
grant execute on function elan_private.save_application_review(uuid,text,text,timestamptz,text,integer,text,boolean,text),public.elan_save_application_review(uuid,text,text,timestamptz,text,integer,text,boolean,text),elan_private.my_applications(),public.elan_my_applications(),elan_private.interview_reply(uuid,text,text,integer),public.elan_interview_reply(uuid,text,text,integer) to authenticated;
create table public.elan_acknowledgements(enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,status text not null default 'pending' check(status in ('pending','sending','sent','failed','unconfigured')),attempted_at timestamptz,sent_at timestamptz,provider_id text);
alter table public.elan_acknowledgements enable row level security;
revoke all on public.elan_acknowledgements from public,anon,authenticated;
grant select on public.elan_acknowledgements to authenticated;
grant all on public.elan_acknowledgements to service_role;
create policy acknowledgements_admin on public.elan_acknowledgements for select to authenticated using(exists(select 1 from public.elan_staff where user_id=(select auth.uid()) and role='admin'));
create function elan_private.queue_acknowledgement() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.elan_acknowledgements(enquiry_id) values(new.id);return new;end $$;
revoke all on function elan_private.queue_acknowledgement() from public,anon,authenticated;
create trigger queue_acknowledgement after insert on public.elan_enquiries for each row execute function elan_private.queue_acknowledgement();
