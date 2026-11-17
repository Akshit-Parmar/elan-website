begin;
-- Explicit aliases connect the existing operational department names to the form.
create function elan_private.department_key(p text) returns text language sql immutable set search_path='' as $$
 select case lower(trim(coalesce(p,'')))
 when 'design & media' then 'design' when 'partnerships' then 'sponsorship'
 when 'school outreach' then 'outreach' when 'operations & hospitality' then 'logistics'
 when 'programme & crisis command' then 'crisis command'
 when 'hr (human resource)' then 'hr' when 'human resource' then 'hr' when 'human resources' then 'hr'
 else lower(trim(coalesce(p,''))) end
$$;
create function elan_private.can_read_department_application(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null)
 and exists(select 1 from public.elan_enquiries e where e.id=p_id and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application') and
 (elan_private.recruitment_manager() or exists(select 1 from public.elan_oc_access a where a.user_id=auth.uid() and a.role in ('member','lead') and
 (elan_private.department_key(a.department)='hr' or (elan_private.department_key(a.department)<>'' and elan_private.department_key(a.department)=elan_private.department_key(e.details->>'department'))))))
$$;
create table public.elan_department_feedback(
 enquiry_id uuid references public.elan_enquiries(id) on delete cascade,
 reviewer_id uuid references auth.users(id) on delete cascade,
 department text not null,
 feedback text not null check(length(trim(feedback)) between 1 and 4000),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(enquiry_id,reviewer_id)
);
create index elan_department_feedback_reviewer on public.elan_department_feedback(reviewer_id);
alter table public.elan_department_feedback enable row level security;
revoke all on public.elan_department_feedback from public,anon,authenticated;
grant select on public.elan_department_feedback to authenticated;
create policy feedback_read on public.elan_department_feedback for select to authenticated using
 (elan_private.can_read_department_application(enquiry_id) and (reviewer_id=(select auth.uid()) or (select elan_private.recruitment_manager())));
create function elan_private.department_applications() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and deleted_at is null) or
 not (elan_private.recruitment_manager() or exists(select 1 from public.elan_oc_access where user_id=auth.uid() and role in ('member','lead'))) then raise exception 'Organiser access required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'full_name',e.full_name,'created_at',e.created_at,'stage',coalesce(r.stage,'new'),'details',
 (select coalesce(jsonb_object_agg(k,v),'{}') from jsonb_each(e.details) d(k,v) where k=any(array['full_name','city','institution','study_year','age_group','instagram','linkedin','department','second_department','responsibility_level','other_department','motivation','experience','skills','work_sample','department_question','department_answer','leadership_answer','weekly_hours','start_date','meeting_availability','other_commitments','in_person','missed_deadline','additional_notes'])),
 'feedback',f.feedback,'feedback_version',coalesce(f.version,0)) order by e.created_at desc)
 from public.elan_enquiries e left join public.elan_oc_recruitment r on r.enquiry_id=e.id
 left join public.elan_department_feedback f on f.enquiry_id=e.id and f.reviewer_id=auth.uid()
 where elan_private.can_read_department_application(e.id)),'[]');
end $$;
create function elan_private.save_department_feedback(p_id uuid,p_feedback text,p_expected integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare d text;v integer;
begin
 if not elan_private.can_read_department_application(p_id) then raise exception 'Application access denied';end if;
 select department into d from public.elan_oc_access where user_id=auth.uid() and role in ('member','lead');
 if d is null then raise exception 'Department membership required';end if;
 if p_feedback is null or length(trim(p_feedback)) not between 1 and 4000 then raise exception 'Write between 1 and 4000 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended('department-feedback:'||p_id||auth.uid(),0));
 if p_expected is null or coalesce((select version from public.elan_department_feedback where enquiry_id=p_id and reviewer_id=auth.uid()),0)<>p_expected then raise exception 'Feedback changed. Reload before saving.';end if;
 insert into public.elan_department_feedback(enquiry_id,reviewer_id,department,feedback) values(p_id,auth.uid(),d,trim(p_feedback))
 on conflict(enquiry_id,reviewer_id) do update set feedback=excluded.feedback,department=excluded.department,version=elan_department_feedback.version+1,updated_at=now() returning version into v;
 return jsonb_build_object('version',v);
end $$;
create function public.elan_department_applications() returns jsonb language sql security invoker set search_path='' as $$select elan_private.department_applications()$$;
create function public.elan_save_department_feedback(p_id uuid,p_feedback text,p_expected integer) returns jsonb language sql security invoker set search_path='' as $$select elan_private.save_department_feedback(p_id,p_feedback,p_expected)$$;
revoke all on function elan_private.department_key(text),elan_private.can_read_department_application(uuid),elan_private.department_applications(),elan_private.save_department_feedback(uuid,text,integer),public.elan_department_applications(),public.elan_save_department_feedback(uuid,text,integer) from public,anon;
grant execute on function elan_private.can_read_department_application(uuid),elan_private.department_applications(),elan_private.save_department_feedback(uuid,text,integer),public.elan_department_applications(),public.elan_save_department_feedback(uuid,text,integer) to authenticated;
commit;
