-- Resolve portal membership from server records; the URL and user-editable metadata never grant roles.
create table elan_private.applicant_logins(user_id uuid primary key references auth.users on delete cascade);
revoke all on elan_private.applicant_logins from public,anon,authenticated;
create function elan_private.login_portal() returns text language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); u auth.users;
begin
 select * into u from auth.users where id=uid and email_confirmed_at is not null and deleted_at is null;
 if not found then return 'none';end if;
 if exists(select 1 from public.elan_staff where user_id=uid and role='admin') then return 'admin';end if;
 if exists(select 1 from public.elan_oc_reviewers where user_id=uid) or exists(select 1 from public.elan_oc_access where user_id=uid)
 or exists(select 1 from public.elan_oc_pending_access where email=lower(u.email)) or exists(select 1 from public.elan_staff where user_id=uid and role='organiser') then return 'organiser';end if;
 if exists(select 1 from public.elan_enquiries e where lower(e.email)=lower(u.email) and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')
 and (e.created_at<=u.created_at or exists(select 1 from elan_private.applicant_logins where user_id=uid))) then return 'applicant';end if;
 return 'participant';
end$$;
create function public.elan_login_portal() returns text language sql security invoker set search_path='' as $$select elan_private.login_portal()$$;
-- Existing participants who themselves applied can explicitly move to recruitment.
create function elan_private.join_applicant_login() returns void language plpgsql security definer set search_path='' as $$
begin
 if elan_private.login_portal()<>'participant' or not exists(select 1 from public.elan_enquiries e join auth.users u on lower(u.email)=lower(e.email) where u.id=auth.uid() and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application')) then raise exception 'No eligible application for this account';end if;
 insert into elan_private.applicant_logins values(auth.uid()) on conflict do nothing;
end$$;
create function public.elan_join_applicant_login() returns void language sql security invoker set search_path='' as $$select elan_private.join_applicant_login()$$;
revoke all on function public.elan_join_applicant_login(),elan_private.join_applicant_login(),public.elan_login_portal(),elan_private.login_portal() from public,anon;
grant execute on function public.elan_join_applicant_login(),elan_private.join_applicant_login(),public.elan_login_portal(),elan_private.login_portal() to authenticated;
do $$declare tbl text;begin foreach tbl in array array['elan_profiles','elan_registrations','elan_attendees','elan_payments','elan_support','elan_submissions'] loop
 execute format('create policy participant_portal_only on public.%I as restrictive for select to authenticated using ((select elan_private.login_portal())=''participant'')',tbl);
end loop;end$$;
create function elan_private.has_own_application() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.elan_enquiries e join auth.users u on lower(u.email)=lower(e.email) where u.id=auth.uid() and u.email_confirmed_at is not null and (e.details->>'application_version'='2' or e.details->>'intent'='2027 organising committee application'))$$;
create function public.elan_has_own_application() returns boolean language sql security invoker set search_path='' as $$select elan_private.has_own_application()$$;
revoke all on function public.elan_has_own_application(),elan_private.has_own_application() from public,anon;
grant execute on function public.elan_has_own_application(),elan_private.has_own_application() to authenticated;

create or replace function public.elan_oc_progress(p_id uuid,p_status text) returns void language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
perform elan_private.oc_progress(p_id,p_status);end$$;
create or replace function public.elan_review_submit(i uuid,k text,p jsonb,f text) returns void language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
perform elan_private.review_submit(i,k,p,f);end$$;
create or replace function public.elan_review_decide(i uuid,d text,n text) returns text language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.review_with_plan(i,d,n,null,null);end$$;
create or replace function public.elan_review_reopen(i uuid) returns void language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
perform elan_private.review_reopen(i);end$$;
create or replace function public.elan_review_with_plan(i uuid,d text,n text,due date,owner_seat text) returns text language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.review_with_plan(i,d,n,due,owner_seat);end$$;
create or replace function public.elan_my_applications() returns jsonb language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'applicant' then raise exception 'Wrong portal: applicant access required' using errcode='42501';end if;
return elan_private.my_applications();end$$;
create or replace function public.elan_interview_reply(p_id uuid,p_reply text,p_note text,p_expected integer) returns void language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'applicant' then raise exception 'Wrong portal: applicant access required' using errcode='42501';end if;
perform elan_private.interview_reply(p_id,p_reply,p_note,p_expected);end$$;
create or replace function public.elan_claim_appointment() returns boolean language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.claim_appointment();end$$;
create or replace function public.elan_applicant_profile() returns jsonb language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'applicant' then raise exception 'Wrong portal: applicant access required' using errcode='42501';end if;
return elan_private.applicant_profile();end$$;
create or replace function public.elan_ops_desk() returns jsonb language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.ops_desk();end$$;
create or replace function public.elan_ops_assign(p_owner uuid,p_title text,p_brief text,p_due date) returns uuid language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.ops_assign(p_owner,p_title,p_brief,p_due);end$$;
create or replace function public.elan_ops_brief(p_department text,p_title text,p_body text) returns uuid language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.ops_brief(p_department,p_title,p_body);end$$;
create or replace function public.elan_desk_context() returns jsonb language plpgsql security invoker set search_path='' as $$
begin if elan_private.login_portal()<>'organiser' then raise exception 'Wrong portal: organiser access required' using errcode='42501';end if;
return elan_private.desk_context();end$$;
