-- Existing-project upgrade: install after leadership-recruitment.sql.
-- Generates a worker-only credential inside Vault; no secret is returned or placed in source.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='elan_applicant_mail_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(48),'hex'),'elan_applicant_mail_token');
 end if;
 if not exists(select 1 from vault.secrets where name='elan_applicant_mail_url') then
  perform vault.create_secret('https://aptaodflhiopzjibyyzn.supabase.co/functions/v1/elan-applicant-mail','elan_applicant_mail_url');
 end if;
end $$;
create table if not exists elan_private.mail_worker_health (
 singleton boolean primary key default true check(singleton),
 last_completed_at timestamptz, sender_configured boolean not null default false,
 last_processed integer not null default 0
);
alter table elan_private.mail_worker_health enable row level security;
revoke all on elan_private.mail_worker_health from public,anon,authenticated;
create or replace function public.elan_verify_mail_worker(p_token text) returns boolean
language sql stable security definer set search_path='' as $$
 select length(coalesce(p_token,'')) between 32 and 256 and exists(
 select 1 from vault.decrypted_secrets where name='elan_applicant_mail_token'
 and extensions.digest(decrypted_secret,'sha256')=extensions.digest(p_token,'sha256'));
$$;
revoke all on function public.elan_verify_mail_worker(text) from public,anon,authenticated;
grant execute on function public.elan_verify_mail_worker(text) to service_role;
create or replace function public.elan_mail_worker_completed(p_configured boolean,p_processed integer) returns void
language sql security definer set search_path='' as $$
 insert into elan_private.mail_worker_health(singleton,last_completed_at,sender_configured,last_processed)
 values(true,now(),coalesce(p_configured,false),greatest(coalesce(p_processed,0),0))
 on conflict(singleton) do update set last_completed_at=excluded.last_completed_at,
 sender_configured=excluded.sender_configured,last_processed=excluded.last_processed;
$$;
revoke all on function public.elan_mail_worker_completed(boolean,integer) from public,anon,authenticated;
grant execute on function public.elan_mail_worker_completed(boolean,integer) to service_role;
create or replace function elan_private.mail_automation_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not elan_private.recruitment_manager() then raise exception 'Recruitment access required';end if;
 return jsonb_build_object('scheduled',exists(select 1 from cron.job where jobname='elan-applicant-mail' and active),
 'last_completed_at',(select last_completed_at from elan_private.mail_worker_health where singleton),
 'healthy',exists(select 1 from elan_private.mail_worker_health where singleton and sender_configured and last_completed_at>now()-interval '5 minutes')
 and exists(select 1 from cron.job where jobname='elan-applicant-mail' and active));
end $$;
revoke all on function elan_private.mail_automation_status() from public,anon;
grant execute on function elan_private.mail_automation_status() to authenticated;
create or replace function public.elan_mail_automation_status() returns jsonb
language sql security invoker set search_path='' as $$select elan_private.mail_automation_status()$$;
revoke all on function public.elan_mail_automation_status() from public,anon;
grant execute on function public.elan_mail_automation_status() to authenticated;
create or replace function elan_private.run_applicant_mail_job() returns void
language plpgsql security definer set search_path='' as $$
declare endpoint text;token text;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='elan_applicant_mail_url' limit 1;
 select decrypted_secret into token from vault.decrypted_secrets where name='elan_applicant_mail_token' limit 1;
 if endpoint is distinct from 'https://aptaodflhiopzjibyyzn.supabase.co/functions/v1/elan-applicant-mail' or length(coalesce(token,''))<32 then raise exception 'Applicant mail configuration invalid';end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=120000);
end $$;
revoke all on function elan_private.run_applicant_mail_job() from public,anon,authenticated,service_role;
-- Activate only after deploying the matching worker:
-- select cron.schedule('elan-applicant-mail','* * * * *','select elan_private.run_applicant_mail_job();');
