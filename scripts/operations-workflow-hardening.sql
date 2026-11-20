-- Current assignment remains required after a department transfer.
begin;
create or replace function elan_private.work_mail_allowed(u uuid,t text,i uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a public.elan_oc_access;
begin
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and deleted_at is null) then return false;end if;
 if elan_private.operations_leader(u) then return true;end if;
 select * into a from public.elan_oc_access where user_id=u;
 if a.user_id is null then return false;end if;
 if t='application' then return exists(select 1 from public.elan_enquiries e where e.id=i and (elan_private.department_key(a.department)='hr' or elan_private.department_key(e.details->>'department')=elan_private.department_key(a.department)));
 elsif t='interview' then return exists(select 1 from public.elan_oc_recruitment r where r.enquiry_id=i and u=any(r.interviewer_ids) and r.stage='interview' and r.interview_published);
 elsif t='task' then return exists(select 1 from public.elan_oc_tasks r where r.id=i and (r.department=a.department and (r.assigned_to=u or a.role='lead')));
 elsif t='review' then return exists(select 1 from public.elan_oc_requests r where r.id=i and (r.department=a.department and (r.submitted_by=u or a.role='lead')) and (r.kind<>'board' or r.payload->>'audience' in ('department',a.role) or r.submitted_by=u));
 elsif t='handoff' then return exists(select 1 from public.elan_work_handoffs r where r.id=i and (r.created_by=u or a.role='lead' and a.department in (r.from_department,r.to_department)));
 elsif t='briefing' then return exists(select 1 from public.elan_oc_board r where r.id=i and r.department=a.department and r.audience in ('department',a.role));end if;
 return false;
end$$;
commit;
