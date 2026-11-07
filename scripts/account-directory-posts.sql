-- Presentation only. Keep staff role independent from the directory badge and deletion checks.
create or replace function elan_private.accounts(p_search text,p_offset integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if p_offset<0 or p_offset>1000000 or length(p_search)>150 then raise exception 'Invalid search';end if;
 with candidates as (
 select u.id,u.email,u.email_confirmed_at,u.created_at,u.last_sign_in_at,
 coalesce(nullif(m.name,''),nullif(p.full_name,'')) as full_name,s.role,
 case when r.seat is not null then 'Leadership' else coalesce(a.department,q.department,m.department) end as department,
 case when s.role='admin' then 'Admin'
 when r.seat='assistant' then 'OC · Assistant Director' when r.seat='director' then 'OC · Director'
 when q.access in ('director','assistant') then 'OC · '||case q.access when 'director' then 'Director' else 'Assistant Director' end||' (pending)'
 when a.user_id is not null or q.member_id is not null or s.role='organiser' or m.id is not null then 'OC · '||coalesce(nullif(m.role,''),case when coalesce(a.role,q.access)='lead' then 'Department head' else 'Committee member' end)||case when q.member_id is not null then ' (pending)' when a.user_id is null and s.role is null then ' (record only)' else '' end
 when exists(select 1 from public.elan_enquiries e where lower(e.email)=lower(u.email) and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application') and (e.created_at<=u.created_at or exists(select 1 from elan_private.applicant_logins al where al.user_id=u.id))) then 'OC applicant'
 else 'Participant' end as display_label
 from auth.users u left join public.elan_profiles p on p.user_id=u.id left join public.elan_staff s on s.user_id=u.id left join public.elan_oc_access a on a.user_id=u.id left join public.elan_oc_reviewers r on r.user_id=u.id left join public.elan_oc_members_2027 m on m.email=lower(u.email) left join public.elan_oc_pending_access q on q.email=lower(u.email) where u.deleted_at is null
 ),filtered as(select * from candidates where position(lower(p_search) in lower(concat_ws(' ',email,full_name,department,display_label)))>0)
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from (select * from filtered order by created_at desc,id limit 30 offset p_offset)x),'[]'::jsonb)) into result;
 return result;
end$$;
