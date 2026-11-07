-- Read only the information needed to coordinate one department or the summit.
create function elan_private.ops_desk() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare leader boolean; a public.elan_oc_access; uid uuid:=auth.uid(); result jsonb;
begin
 select exists(select 1 from public.elan_oc_reviewers where user_id=uid) into leader;
 select * into a from public.elan_oc_access where user_id=uid;
 if uid is null or (not leader and a.user_id is null) then raise exception 'Organiser access required';end if;
 select jsonb_build_object(
 'teams',(select coalesce(jsonb_agg(to_jsonb(d) order by d.department),'[]') from (select m.id,m.department,m.tool from public.elan_oc_modules m where leader or m.department=a.department union all select null::uuid,x.department,'general' from (select distinct department from public.elan_oc_access) x where (leader or x.department=a.department) and not exists(select 1 from public.elan_oc_modules m where m.department=x.department))d),
 'people',(select coalesce(jsonb_agg(jsonb_build_object('id',x.user_id,'name',coalesce(nullif(m.name,''),x.label),'department',x.department,'role',x.role) order by x.department,x.role,x.label),'[]') from public.elan_oc_access x left join public.elan_oc_members_2027 m on m.email=lower(x.label) where leader or x.department=a.department),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t) order by t.due_on nulls last,t.title),'[]') from public.elan_oc_tasks t where leader or (t.department=a.department and (a.role='lead' or t.assigned_to=uid))),
 'posts',(select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc),'[]') from public.elan_oc_board p where leader or (p.department=a.department and p.audience in ('department',a.role))),
 'handoffs',(select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at desc),'[]') from public.elan_oc_handoffs h where leader or h.department=a.department),
 'finance',(select coalesce(jsonb_agg(to_jsonb(b)),'[]') from (select acct.* from public.elan_oc_modules m cross join lateral public.elan_oc_accounts(m.id,(now() at time zone 'Asia/Kolkata')::date) acct where leader and m.tool='finance')b),
 'registers',(select coalesce(jsonb_agg(jsonb_build_object('department',m.department,'title',r.title,'stage',r.details->>'stage','updated',r.updated_at) order by r.updated_at desc),'[]') from public.elan_oc_records r join public.elan_oc_modules m on m.id=r.module_id where leader or m.department=a.department)
 ) into result;return result;
end$$;
create function public.elan_ops_desk() returns jsonb language sql security invoker set search_path='' as $$select elan_private.ops_desk()$$;
create function elan_private.ops_assign(p_owner uuid,p_title text,p_brief text,p_due date) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.elan_oc_access; job uuid;
begin
 select * into strict target from public.elan_oc_access where user_id=p_owner for share;
 if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) and not exists(select 1 from public.elan_oc_access where user_id=auth.uid() and role='lead' and department=target.department) then raise exception 'Lead or leadership access required';end if;
 insert into public.elan_oc_tasks(department,assigned_to,title,brief,due_on) values(target.department,p_owner,trim(p_title),trim(p_brief),p_due) returning id into job;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'organiser:assign-task',job::text);return job;
end$$;
create function public.elan_ops_assign(p_owner uuid,p_title text,p_brief text,p_due date) returns uuid language sql security invoker set search_path='' as $$select elan_private.ops_assign(p_owner,p_title,p_brief,p_due)$$;
create function elan_private.ops_brief(p_department text,p_title text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare id_out uuid;
begin
 if not exists(select 1 from public.elan_oc_reviewers where user_id=auth.uid()) then raise exception 'Leadership access required';end if;
 if not exists(select 1 from public.elan_oc_modules where department=p_department) and not exists(select 1 from public.elan_oc_access where department=p_department) then raise exception 'Unknown department';end if;
 insert into public.elan_oc_board(department,audience,kind,title,body) values(p_department,'department','briefing',trim(p_title),trim(p_body)) returning id into id_out;
 insert into public.elan_audit(actor_id,action,target) values(auth.uid(),'organiser:issue-brief',id_out::text);return id_out;
end$$;
create function public.elan_ops_brief(p_department text,p_title text,p_body text) returns uuid language sql security invoker set search_path='' as $$select elan_private.ops_brief(p_department,p_title,p_body)$$;
revoke all on function elan_private.ops_desk(),public.elan_ops_desk(),elan_private.ops_assign(uuid,text,text,date),public.elan_ops_assign(uuid,text,text,date),elan_private.ops_brief(text,text,text),public.elan_ops_brief(text,text,text) from public,anon;
grant execute on function elan_private.ops_desk(),public.elan_ops_desk(),elan_private.ops_assign(uuid,text,text,date),public.elan_ops_assign(uuid,text,text,date),elan_private.ops_brief(text,text,text),public.elan_ops_brief(text,text,text) to authenticated;
