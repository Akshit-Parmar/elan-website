begin;
alter table public.elan_member_onboarding add column if not exists meeting_at timestamptz;
alter table public.elan_member_onboarding add column if not exists meeting_details text not null default '' check(length(meeting_details)<=2000);
create or replace function elan_private.my_onboarding() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('reporting_person',o.reporting_person,'responsibilities',o.responsibilities,'first_tasks',o.first_tasks,'documents',o.documents,'updated_at',o.updated_at,'meeting_at',o.meeting_at,'meeting_details',o.meeting_details) order by e.created_at desc),'[]'::jsonb)
 from public.elan_member_onboarding o join public.elan_enquiries e on e.id=o.enquiry_id join public.elan_oc_recruitment r on r.enquiry_id=e.id join auth.users u on lower(u.email)=lower(e.email)
 where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and r.stage='selected'
 and exists(select 1 from public.elan_oc_access a where a.user_id=u.id)
 and not exists(select 1 from public.elan_staff s where s.user_id=u.id and s.role='admin')
$$;
commit;
