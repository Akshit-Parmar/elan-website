-- Run AFTER the worker and secrets are configured. Uses Supabase Vault, pg_cron and pg_net.
-- Add these two Vault secrets first through the dashboard:
-- elan_applicant_mail_url = https://YOUR_PROJECT.supabase.co/functions/v1/elan-applicant-mail
-- elan_applicant_mail_token = the same random 32+ character value as APPLICANT_MAIL_JOB_TOKEN
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function elan_private.run_applicant_mail_job() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; token text;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='elan_applicant_mail_url' limit 1;
 select decrypted_secret into token from vault.decrypted_secrets where name='elan_applicant_mail_token' limit 1;
 if endpoint is null or endpoint !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/elan-applicant-mail$' or length(coalesce(token,''))<32 then raise exception 'Configure applicant mail URL and token in Vault first';end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=120000);
end $$;
revoke all on function elan_private.run_applicant_mail_job() from public,anon,authenticated,service_role;
-- Named jobs are updated when re-run; no duplicate schedules are created.
select cron.schedule('elan-applicant-mail','* * * * *','select elan_private.run_applicant_mail_job();');
