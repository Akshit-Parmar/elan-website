-- Apply after applicant-email-automation.sql and fix-application-review-validation.sql.
begin;
create table public.elan_interview_feedback (
 enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,
 interviewer text not null check(length(interviewer) between 1 and 150),
 department_fit text not null check(length(department_fit) between 1 and 1500),
 availability text not null check(length(availability) between 1 and 1000),
 skills text not null check(length(skills) between 1 and 1500),
 recommendation text not null check(recommendation in ('Proceed','Discuss','Do not proceed')),
 comments text not null default '' check(length(comments)<=3000),
 updated_at timestamptz not null default now()
);
alter table public.elan_interview_feedback enable row level security;
revoke all on public.elan_interview_feedback from public,anon,authenticated;
grant select,insert,update on public.elan_interview_feedback to authenticated;
create policy feedback_admin on public.elan_interview_feedback for all to authenticated using(exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin')) with check(exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin'));
create table public.elan_member_onboarding (
 enquiry_id uuid primary key references public.elan_enquiries(id) on delete cascade,
 reporting_person text not null check(length(reporting_person) between 1 and 200),
 responsibilities text not null check(length(responsibilities) between 1 and 3000),
 first_tasks text not null check(length(first_tasks) between 1 and 3000),
 documents text not null default '' check(length(documents)<=3000),
 updated_at timestamptz not null default now()
);
alter table public.elan_member_onboarding enable row level security;
revoke all on public.elan_member_onboarding from public,anon,authenticated;
grant select,insert,update on public.elan_member_onboarding to authenticated;
create policy onboarding_admin on public.elan_member_onboarding for all to authenticated using(exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin')) with check(exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin'));
create function elan_private.my_onboarding() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('reporting_person',o.reporting_person,'responsibilities',o.responsibilities,'first_tasks',o.first_tasks,'documents',o.documents,'updated_at',o.updated_at) order by e.created_at desc),'[]'::jsonb)
 from public.elan_member_onboarding o join public.elan_enquiries e on e.id=o.enquiry_id join public.elan_oc_recruitment r on r.enquiry_id=e.id join auth.users u on lower(u.email)=lower(e.email)
 where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and r.stage='selected'
 and exists(select 1 from public.elan_oc_access a where a.user_id=u.id)
 and not exists(select 1 from public.elan_staff s where s.user_id=u.id and s.role='admin')
$$;
create function public.elan_my_onboarding() returns jsonb language sql security invoker set search_path='' as $$select elan_private.my_onboarding()$$;
revoke all on function elan_private.my_onboarding(),public.elan_my_onboarding() from public,anon;
grant execute on function elan_private.my_onboarding(),public.elan_my_onboarding() to authenticated;
commit;
