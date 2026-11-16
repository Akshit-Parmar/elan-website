-- Apply after recruitment-readiness.sql. Existing data and admin authority are preserved.
begin;
create function elan_private.recruitment_manager() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null)
 and (exists(select 1 from public.elan_staff s where s.user_id=auth.uid() and s.role='admin') or exists(select 1 from public.elan_oc_reviewers r where r.user_id=auth.uid() and r.seat in ('director','assistant')))
$$;
revoke all on function elan_private.recruitment_manager() from public,anon;
grant execute on function elan_private.recruitment_manager() to authenticated;
grant select on public.elan_enquiries to authenticated;
create policy recruitment_leadership_applications on public.elan_enquiries for select to authenticated using((select elan_private.recruitment_manager()) and (details->>'application_version'='2' or details->>'intent'='2027 organising committee application'));
create policy recruitment_leadership_read on public.elan_oc_recruitment for select to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_oc_recruitment.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create policy recruitment_leadership_read on public.elan_oc_recruitment_history for select to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_oc_recruitment_history.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create policy recruitment_leadership_read on public.elan_acknowledgements for select to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_acknowledgements.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create policy recruitment_leadership_read on public.elan_application_mail for select to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_application_mail.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create policy recruitment_leadership_edit on public.elan_interview_feedback for all to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_interview_feedback.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application'))) with check((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_interview_feedback.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create policy recruitment_leadership_edit on public.elan_member_onboarding for all to authenticated using((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_member_onboarding.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application'))) with check((select elan_private.recruitment_manager()) and exists(select 1 from public.elan_enquiries e where e.id=elan_member_onboarding.enquiry_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')));
create or replace function elan_private.save_recruitment(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment;
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 if not exists(select 1 from public.elan_enquiries where id=p_id and (details->>'intent'='2027 organising committee application' or details->>'application_version'='2')) then raise exception 'OC application not found';end if;
 perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') and (p_stage='selected' or exists(select 1 from public.elan_oc_recruitment where enquiry_id=p_id and stage='selected')) then raise exception 'Final selection and changes to selected appointments are managed by the administrator';end if;
 if p_expected is null or coalesce((select version from public.elan_oc_recruitment where enquiry_id=p_id),0)<>p_expected then raise exception 'This application was updated. Reload before saving.';end if;
 insert into public.elan_oc_recruitment(enquiry_id,stage,notes,interview_at,interview_details) values(p_id,p_stage,p_notes,p_interview,p_details)
 on conflict(enquiry_id) do update set stage=excluded.stage,notes=excluded.notes,interview_at=excluded.interview_at,interview_details=excluded.interview_details,version=elan_oc_recruitment.version+1,updated_at=now() returning * into r;
 insert into public.elan_oc_recruitment_history(enquiry_id,stage,notes,interview_at,interview_details,actor) values(p_id,r.stage,r.notes,r.interview_at,r.interview_details,auth.uid());
 return r;
end $$;
create or replace function elan_private.save_application_review(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer,p_message text,p_published boolean,p_instructions text) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment; old_at timestamptz;old_instructions text;old_published boolean;
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('recruitment:'||p_id,0));
 select interview_at,interview_instructions,interview_published into old_at,old_instructions,old_published from public.elan_oc_recruitment where enquiry_id=p_id;
 p_published:=coalesce(p_published,false) and p_stage='interview';
 if p_published and (p_interview is null or length(trim(coalesce(p_instructions,'')))=0) then raise exception 'Add an interview time and applicant instructions before publishing';end if;
 r:=elan_private.save_recruitment(p_id,p_stage,p_notes,p_interview,p_details,p_expected);
 update public.elan_oc_recruitment set applicant_message=p_message,interview_published=p_published,interview_instructions=p_instructions,
 interview_reply=case when old_at is distinct from p_interview or old_instructions is distinct from p_instructions or old_published is distinct from p_published then '' else interview_reply end,
 interview_reply_note=case when old_at is distinct from p_interview or old_instructions is distinct from p_instructions or old_published is distinct from p_published then '' else interview_reply_note end
 where enquiry_id=p_id returning * into r;
 return r;
end $$;
commit;
