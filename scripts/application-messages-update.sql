begin;
create or replace function elan_private.application_stage_message(stage text) returns text language sql immutable set search_path='' as $$ select case stage
when 'new' then 'Thank you for applying to the Élan Summit 2027 organising committee. We have received your application. You can follow its progress here.'
when 'under_review' then 'Your application is now under review. Our team is looking through your answers and department preferences. We will update you when there is a decision or a next step.'
when 'shortlisted' then 'You have been shortlisted for the Élan Summit 2027 organising committee. We would like to take your application forward. Interview details or further instructions will appear here once confirmed. You do not need to submit another application.'
when 'interview' then 'Your application has reached the interview stage. Once your invitation is published, your interview time and joining instructions will appear here. Please confirm your attendance when those details are available.'
when 'waitlisted' then 'Your application is on the waiting list. We have not confirmed an organising role for you at this stage. If a suitable place becomes available, we will update you here and by email.'
when 'selected' then 'You have been selected for the Élan Summit 2027 organising committee. Your confirmed department and onboarding details will be shared with you. Open the organiser workspace once your assigned access is active.'
when 'not_selected' then 'Thank you for the time and effort you put into your application. We will not be taking it forward for the Élan Summit 2027 organising committee. We appreciate your interest in being part of the team.'
else '' end $$;
create or replace function elan_private.application_message_default() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if nullif(trim(new.applicant_message),'') is null
 or exists(select 1 from unnest(array['new','under_review','shortlisted','interview','waitlisted','selected','not_selected']) s where new.applicant_message=elan_private.application_stage_message(s))
 then new.applicant_message:=elan_private.application_stage_message(new.stage);
 elsif tg_op='UPDATE' and new.stage is distinct from old.stage and new.applicant_message is not distinct from old.applicant_message then
 new.applicant_message:=elan_private.application_stage_message(new.stage);
 end if;
 return new;
end$$;
drop trigger if exists elan_application_message_default on public.elan_oc_recruitment;
create trigger elan_application_message_default before insert or update on public.elan_oc_recruitment for each row execute function elan_private.application_message_default();
revoke all on function elan_private.application_stage_message(text),elan_private.application_message_default() from public,anon,authenticated;
create or replace function elan_private.work_event() returns trigger language plpgsql security definer set search_path='' as $$
declare i uuid;t text;title_in text;k text;urgent boolean:=false; actor_name text; actor_role text; applicant_name text; changes text[]:=array[]::text[];
begin
 if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new;end if;
 if tg_table_name='elan_enquiries' then
 if not (new.details->>'intent'='2027 organising committee application' or new.details->>'application_version'='2') then return new;end if;i:=new.id;t:='application';title_in:='New OC application received';
 elsif tg_table_name='elan_oc_recruitment' then select * into new from public.elan_oc_recruitment where enquiry_id=new.enquiry_id; if tg_op='UPDATE' and (new.stage,new.interview_at,new.interview_published,new.interview_instructions,new.interview_reply,new.applicant_message,new.duration_minutes,new.interviewer_ids) is not distinct from (old.stage,old.interview_at,old.interview_published,old.interview_instructions,old.interview_reply,old.applicant_message,old.duration_minutes,old.interviewer_ids) then return new;end if;i:=new.enquiry_id;t:='application';title_in:='OC application updated · '||replace(new.stage,'_',' ');
 elsif tg_table_name='elan_oc_tasks' then i:=new.id;t:='task';title_in:='Task '||case when tg_op='INSERT' then 'assigned' else 'updated' end||': '||new.title;
 elsif tg_table_name='elan_oc_requests' then i:=new.id;t:='review';title_in:='Department submission · '||new.status;
 elsif tg_table_name='elan_oc_votes' then i:=new.request_id;t:='review';title_in:='A leadership decision was recorded';
 elsif tg_table_name='elan_work_revisions' then i:=new.request_id;t:='review';title_in:=case when new.replacement_id is null then 'Changes requested on your submission' else 'Revised submission received' end;
 elsif tg_table_name='elan_work_handoffs' then i:=new.id;t:='handoff';title_in:='Department handoff · '||replace(new.status,'_',' ')||': '||new.title;
 elsif tg_table_name='elan_oc_board' then i:=new.id;t:='briefing';title_in:='Department briefing: '||new.title;
 else return new;end if;
 if t='application' then
 select coalesce(nullif(trim(full_name),''),'Unnamed applicant') into applicant_name from public.elan_enquiries where id=i;
 if tg_table_name='elan_oc_recruitment' and tg_op='UPDATE' then
 if new.stage is distinct from old.stage then changes:=array_append(changes,initcap(replace(old.stage,'_',' '))||' → '||initcap(replace(new.stage,'_',' ')));end if;
 if (new.interview_at,new.duration_minutes,new.interviewer_ids) is distinct from (old.interview_at,old.duration_minutes,old.interviewer_ids) then changes:=array_append(changes,'Interview arrangements changed');end if;
 if new.interview_published is distinct from old.interview_published then changes:=array_append(changes,case when new.interview_published then 'Interview invitation published' else 'Interview invitation unpublished' end);end if;
 if new.interview_instructions is distinct from old.interview_instructions then changes:=array_append(changes,'Interview instructions updated');end if;
 if new.interview_reply is distinct from old.interview_reply then changes:=array_append(changes,'Applicant response: '||coalesce(nullif(new.interview_reply,''),'Awaiting response'));end if;
 if cardinality(changes)=0 then changes:=array_append(changes,'Applicant message updated');end if;
 title_in:=array_to_string(changes,'; ');
 end if;
 if auth.uid() is null then actor_name:='Élan system';
 else
 select coalesce((select nullif(trim(m.name),'') from public.elan_oc_members_2027 m where lower(m.email)=lower(u.email) limit 1),(select nullif(trim(p.full_name),'') from public.elan_profiles p where p.user_id=u.id), nullif(u.email,''), 'Account '||u.id::text) into actor_name from auth.users u where u.id=auth.uid();
 select case when exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then 'Admin' else (select case seat when 'director' then 'Director' when 'assistant' then 'Assistant Director' else initcap(replace(seat,'_',' ')) end from public.elan_oc_reviewers where user_id=auth.uid() limit 1) end into actor_role;
 actor_name:=coalesce(actor_name,'Account '||auth.uid()::text)||case when actor_role is not null then ' ('||actor_role||')' else '' end;
 end if;
 title_in:=coalesce(applicant_name,'Application')||' · '||title_in||' · Changed by: '||actor_name||' · Reference: '||i::text;
 end if;
 k:=tg_table_name||':'||i::text||':'||md5(to_jsonb(new)::text);
 perform elan_private.queue_work_mail(k,t,i,title_in,urgent);return new;
end$$;
commit;
