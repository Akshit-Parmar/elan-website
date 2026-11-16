-- Run on the existing project in Supabase SQL Editor. Safe to re-run.
-- Preserves applications, review history, permissions and email automation.
begin;
create or replace function elan_private.save_application_review(p_id uuid,p_stage text,p_notes text,p_interview timestamptz,p_details text,p_expected integer,p_message text,p_published boolean,p_instructions text) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare r public.elan_oc_recruitment; old_at timestamptz;old_instructions text;old_published boolean;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required'; end if;
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
