alter table public.elan_profiles add column if not exists city text not null default '' check(length(city)<=100), add column if not exists study_year text not null default '' check(length(study_year)<=100);

-- Used only by the mail worker. The address is derived from the saved submission.
create function elan_private.application_account(p_id uuid) returns text language sql security definer set search_path='' as $$
 select case when u.id is null then 'new' when u.email_confirmed_at is null then 'unverified' else 'verified' end
 from public.elan_enquiries e left join auth.users u on lower(e.email)=lower(u.email) and u.deleted_at is null
 where e.id=p_id and (e.details->>'intent'='2027 organising committee application' or e.details->>'application_version'='2') limit 1
$$;
create function public.elan_application_account(p_id uuid) returns text language sql security invoker set search_path='' as $$select elan_private.application_account(p_id)$$;
revoke all on function elan_private.application_account(uuid),public.elan_application_account(uuid) from public,anon,authenticated;
grant execute on function elan_private.application_account(uuid),public.elan_application_account(uuid) to service_role;

create function elan_private.applicant_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('email',u.email,'name',e.full_name,'city',e.details->>'city','institution',e.details->>'institution','year',e.details->>'study_year','phone',e.details->>'phone')
 from auth.users u join public.elan_enquiries e on lower(e.email)=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application') order by e.created_at desc limit 1
$$;
create function public.elan_applicant_profile() returns jsonb language sql security invoker set search_path='' as $$select elan_private.applicant_profile()$$;
create function elan_private.select_applicant(p_id uuid,p_department text,p_notes text,p_expected integer,p_message text) returns public.elan_oc_recruitment language plpgsql security definer set search_path='' as $$
declare e public.elan_enquiries;m public.elan_oc_members_2027;r public.elan_oc_recruitment;
begin
 if not exists(select 1 from public.elan_staff where user_id=auth.uid() and role='admin') then raise exception 'Administrator required';end if;
 if not exists(select 1 from public.elan_oc_modules where department=p_department) then raise exception 'Choose an organising department';end if;
 select * into strict e from public.elan_enquiries where id=p_id and (details->>'application_version'='2' or details->>'intent'='2027 organising committee application');
 r:=elan_private.save_application_review(p_id,'selected',p_notes,null,'',p_expected,p_message,false,'');
 perform pg_advisory_xact_lock(hashtextextended('elan:appointments',0));
 select * into m from public.elan_oc_members_2027 where email=lower(trim(e.email));
 if exists(select 1 from public.elan_oc_pending_access where email=lower(trim(e.email)) and (department<>p_department or access<>'member')) or exists(select 1 from public.elan_oc_reviewers where lower(label)=lower(trim(e.email))) or exists(select 1 from public.elan_oc_access where lower(label)=lower(trim(e.email)) and (department<>p_department or role<>'member')) then raise exception 'An existing assignment differs. Review it in Committee & access before selecting this applicant.';end if;
 perform elan_private.save_direct_member(m.id,e.full_name,e.email,coalesce(e.details->>'phone',''),p_department,coalesce(nullif(m.role,''),'Committee member'),coalesce(m.notes,''),'member',coalesce(m.version,0));
 return r;
end$$;
create function public.elan_select_applicant(p_id uuid,p_department text,p_notes text,p_expected integer,p_message text) returns public.elan_oc_recruitment language sql security invoker set search_path='' as $$select elan_private.select_applicant(p_id,p_department,p_notes,p_expected,p_message)$$;
revoke all on function elan_private.applicant_profile(),public.elan_applicant_profile(),elan_private.select_applicant(uuid,text,text,integer,text),public.elan_select_applicant(uuid,text,text,integer,text) from public,anon;
grant execute on function elan_private.applicant_profile(),public.elan_applicant_profile(),elan_private.select_applicant(uuid,text,text,integer,text),public.elan_select_applicant(uuid,text,text,integer,text) to authenticated;

grant usage on schema elan_private to service_role;
