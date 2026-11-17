-- Run after applicant-mail-worker-activation.sql and deployment of elan-applicant-mail.
-- The credential is generated and verified inside Supabase Vault; no manual token copying.
do $$ begin
 if to_regprocedure('elan_private.run_applicant_mail_job()') is null then raise exception 'Install applicant-mail-worker-activation.sql first';end if;
end $$;
select cron.schedule('elan-applicant-mail','* * * * *','select elan_private.run_applicant_mail_job();');
