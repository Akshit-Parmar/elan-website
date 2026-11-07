insert into public.elan_oc_modules(department,tool) values ('Heads of All Departments','general'),('Chief Advisor','general') on conflict(department) do nothing;

-- Return only department names, seat occupancy and aggregate operational counts.
-- Coordination/advisory titles do not confer reviewer or admin powers.
create function elan_private.desk_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare leadseat boolean; dept text; overview boolean;
begin
 select exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) into leadseat;
 select department into dept from public.elan_oc_access where user_id=auth.uid();
 if not leadseat and dept is null then raise exception 'Organiser access required';end if;
 overview:=leadseat or lower(trim(dept)) in ('heads of all departments','head of all departments','chief advisor');
 return jsonb_build_object('departments',(select coalesce(jsonb_agg(department order by department),'[]') from public.elan_oc_modules),
 'seats',(select coalesce(jsonb_agg(seat),'[]') from public.elan_oc_reviewers),
 'coordination',case when overview then (select coalesce(jsonb_agg(jsonb_build_object('department',m.department,'open',(select count(*) from public.elan_oc_tasks t where t.department=m.department and t.status<>'Done'),'late',(select count(*) from public.elan_oc_tasks t where t.department=m.department and t.status<>'Done' and t.due_on<(now() at time zone 'Asia/Kolkata')::date),'pending',(select count(*) from public.elan_oc_requests r where r.department=m.department and r.status='pending')) order by m.department),'[]') from public.elan_oc_modules m) else null end);
end$$;
create function public.elan_desk_context() returns jsonb language sql security invoker set search_path='' as $$select elan_private.desk_context()$$;
revoke all on function elan_private.desk_context(),public.elan_desk_context() from public,anon;
grant execute on function elan_private.desk_context(),public.elan_desk_context() to authenticated;
