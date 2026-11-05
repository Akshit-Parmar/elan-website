# OC application journey update

Latest email/login update: see [EMAIL-AND-LOGIN-SETUP.md](EMAIL-AND-LOGIN-SETUP.md) for Gmail SMTP support and the remaining owner configuration. Earlier email-provider notes below describe the previous release.

Upload this full package to the GitHub repository using the same structure as before. Cloudflare serves `dist`. The website changes are not published until the upload/build/deploy completes. Do not reset Supabase or run fresh-project.sql against the existing project.

## Using it

- Admin → Workspace → OC applications: grouped answers, Instagram and LinkedIn, stages, private notes, applicant message, interview date and time, invitation controls and applicant reply.
- Applicants: `/application-status` (also linked in Take part and the application page). Sign in/create an account using the same email as the submitted application. Existing applications are matched too; no resubmission required.
- Stages: Received, Under review, Shortlisted, Interview, Selected, Not selected. Review stage is separate from generic enquiry status.
- To invite: choose Interview, set date/time, write applicant instructions, check Publish interview invitation, save. Existing private interview notes are never copied into applicant instructions.
- Applicants can confirm attendance or request another time with a note. Changing the invitation clears the old response. Concurrent edits ask the user to refresh rather than overwrite a newer version.
- Selection does not grant organiser access. Publish the onboarding instructions in Message / next steps, and assign access separately.
- Instagram and LinkedIn are optional. Grade/year remains required, including on the backend.

## Email activation still required

The live API health check returned `emailConfigured: false`. No acknowledgement email was sent during testing.

The acknowledgement implementation uses Resend. Configure a verified sender domain with that provider, then set **RESEND_API_KEY** and **EMAIL_FROM** in Supabase Edge Function secrets. EMAIL_FROM must be the verified sender, for example `Élan Summit <applications@elansummit.com>`, not an unverified Gmail address. Reply-To is `the.elan.summit@gmail.com`. Never commit the key or put it in public-config.json.

New enquiries are queued transactionally with their saved record. The API tries to send the acknowledgement immediately. Missing configuration or email failure does not discard the submission or tell the applicant to resubmit. Admin recruitment displays the email state and provides retry for pending, unconfigured or known-failed acknowledgements. Existing submissions predating this release are not bulk emailed. `sent` means provider accepted, not guaranteed inbox delivery. An uncertain `sending` state requires checking the provider before any manual retry; it is deliberately not blindly resent.

Applicant authentication email is separate from the acknowledgement sender. Ensure Supabase Auth **Confirm email** is enabled and its production SMTP configuration can deliver verification/recovery emails to applicants. The packaged local config now enables confirmation; hosted Auth configuration was not changed or verified by this release. Email-based ownership requires verified email accounts, not automatic signup confirmation.

Interview/status changes appear on the website when the applicant refreshes; this release does not email each stage change. The team can contact the applicant separately when publishing an interview.

## Backend and validation

Applied additive migration `oc_applicant_tracking_and_acknowledgements` to elan-v2. Deployed `elan-api` v6. Existing applications and media retained. No existing interview notes were exposed. New tracking page is noindex and excluded from sitemap; existing public sitemap and verification file preserved.

35 Node tests passed. Build and local reference, module import and search verification passed. Live rollback-only database tests verified email ownership, private-note isolation, unpublished invitation privacy, published interviews, responses, stale writes, cross-applicant denial and admin-only review. Browser QA used fictional data to test reviewer stage saves and applicant interview responses; 390px tracker layout had no horizontal overflow. Real-user signup, email delivery and physical-phone testing remain to be completed after email configuration.

Existing security advisor warning remains: leaked password protection is disabled. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No new table/RLS security advisories were reported.
