NOVEMBER 17 UPDATE: The elan-v2 backend is already updated. Do not rerun the historical SQL files. See docs/UPDATE-2026-11-17.md for the live status and current worker setup. The old APPLICANT_MAIL_JOB_TOKEN environment setup below is superseded by the Vault-verification worker.

# Automated OC applicant emails

This package adds recruitment emails. It does not activate the live Supabase project by itself. Keep your current project and data; do not run fresh-project.sql.

## What gets sent

- Application receipt and account setup: the existing submission flow remains in place.
- Under review, shortlisted, waiting list, selected and not selected: sent when an administrator saves a changed stage.
- Interview invitation: sent when a future interview is published.
- Changed or withdrawn interview: sent when published arrangements change or the invitation is unpublished.
- Interview confirmation or rescheduling request: confirmation emailed to the applicant after their portal response.
- Interview reminder: once within the 24 hours before an unanswered interview, at least 30 minutes after its invitation was sent. No reminder within the final hour.
- Applicant-facing message: sent when an administrator changes the public message without changing the stage.

Emails include the Élan signature, application reference and portal link. Interview times are labelled IST (UTC+05:30). Private reviewer notes, private interview notes and application answers are excluded. Put meeting links and locations in **Interview instructions for the applicant**, not private interview notes.

Installing the upgrade does not send historical updates to everyone. Subsequent changes queue messages. Rapid changes supersede pending outdated emails. A private-note-only save does not send email.

## Activate in your existing Supabase project

1. Back up the database. Confirm the earlier applicant portal upgrades are installed, including application-journey.sql and applicant-workspace.sql.
2. Open SQL Editor, paste the full contents of `scripts/applicant-email-automation.sql`, and run it once. It adds the queue, access policies and triggers; it does not delete applications.
3. Deploy the updated `elan-api` function **and** the new `elan-applicant-mail` function from this package, including their imported files. The latter imports shared mail modules from elan-api. Both have JWT verification disabled in supabase/config.toml; each implements its own authentication. The worker is protected by the job secret, not a public anonymous key.
4. In Edge Function Secrets, keep the existing `GMAIL_APP_PASSWORD`. This is needed separately from Supabase Auth SMTP settings. Alternatively keep your existing `RESEND_API_KEY` and verified `EMAIL_FROM`. Gmail takes precedence if both are configured. Never put these values in frontend files or GitHub.
5. Generate a random secret of at least 32 characters. Save it as Edge Function secret `APPLICANT_MAIL_JOB_TOKEN`.
6. In Supabase Vault, create `elan_applicant_mail_url` with `https://YOUR_PROJECT.supabase.co/functions/v1/elan-applicant-mail`, using your actual project reference. Create `elan_applicant_mail_token` with the exact same job secret from step 5. These are Vault secrets, separate from Edge Function Secrets.
7. Run `scripts/applicant-email-schedule.sql` in SQL Editor. It schedules the worker once a minute. Re-running this schedule updates the named job rather than adding another.
8. Deploy the website files using the usual GitHub/Cloudflare workflow.

The admin save attempts delivery immediately. The scheduled worker handles applicant replies, reminders, pending messages and safe retries even when nobody has the admin page open.

## Check before using it with applicants

Use an inbox you control. Submit a test application and verify the receipt/setup link. Save Under review, publish a future interview, change its time, and respond from the applicant portal. Confirm each email and portal status agree. Finally test selection and the correct organiser destination. Do not use real candidates to test decision emails.

In the admin application review, open **Email delivery history** and use Refresh. Check Supabase Cron job history and Edge Function logs if messages remain pending. Never paste tokens into a support screenshot.

- pending: waiting for the worker.
- sending: claimed by a worker.
- sent: accepted by the mail provider; not proof of inbox placement.
- failed: definitely rejected or not sent; automatically retried after 15 minutes, up to five attempts.
- uncertain: the connection ended without a reliable delivery result; not automatically resent because it may already have arrived.
- cancelled: superseded by a newer review or withdrawn invitation.

After correcting a sender problem, an administrator can retry a definitively failed message in SQL Editor using its queue ID:

```sql
update public.elan_application_mail
set status='pending', attempts=0, available_at=now(), error_code=null
where id='REPLACE_WITH_QUEUE_UUID' and status='failed';
```

The worker rechecks the application before sending. Do not reset sent or uncertain rows without independently checking delivery. SMTP cannot guarantee exactly-once delivery during every network failure. Gmail spam filtering remains outside the website's control.

To pause background delivery:

```sql
select cron.unschedule('elan-applicant-mail');
```

Admin save can still attempt immediate delivery. Removing the transactional sender secrets disables both senders without removing queued records. Do not remove the normal Supabase Auth SMTP settings when doing this.

## Verification included

`node --test tests/application-mail.test.mjs` tests content and delivery handling without sending email. `tests/application-mail-postgres.mjs` exercises the real SQL trigger and claim functions in an isolated PGlite database; install `@electric-sql/pglite@0.5.16` in a temporary test environment to run it. The full project build and validation checks are also included. Live Gmail, Supabase Cron and inbox delivery must be checked after deployment.
