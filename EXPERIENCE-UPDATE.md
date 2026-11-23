# Élan experience update — 23 November 2026

This is the complete deployment package, including the existing website, assets, database scripts and mobile projects. No original package files were intentionally removed.

## Included
- Optional Google Calendar booking sync with exact email matching, duplicate protection, interviewer overlap checks and manual-edit protection. The connection stays off until configured and authorised.
- Recruitment cards show a stage-specific next action. Application answers, booking controls and delivery history use expandable sections.
- Organiser welcome shows the real department/role, department head when available, first assigned task and optional joining meeting. Recruitment reviewers can prepare meeting details in the onboarding brief. Direct-added members use their department contact and assigned tasks; there is no invented personalised brief.
- The 2027 page clearly distinguishes open OC recruitment from unannounced dates, venue and tickets. It links directly to the applicant tracker and 2026 archive. The homepage recruitment strip also links to 2027 plans.
- Confirmed Calendar bookings do not ask the applicant to book or confirm again. Manual invitations still request confirmation.

## Deployment
Push the package's updated website files using the existing GitHub/Cloudflare deployment workflow. The database additions have been applied to elan-v2. The live elan-api function is version 18 and elan-applicant-mail is version 5. Calendar sync is not activated until the owner completes setup. Do not rerun every historical SQL file.

For a different/fresh database, apply the existing migrations in their documented order, then scripts/calendar-booking-sync.sql and scripts/member-welcome-meeting.sql. Do not copy the Calendar integration to another Supabase project without updating and verifying its public project URL/key.

## Activate Calendar sync
After website deployment, open Admin → OC applications → Interview Calendar connection. Follow integrations/google-calendar/SETUP.md. The owner account is the.elan.summit@gmail.com, but verify the actual Calendar ID and event title. Neither the public booking link nor the owner email grants Calendar access.

Until authorised, record bookings manually. Even after authorisation, check a test booking, reschedule and cancellation before relying on the automation. The bridge never edits Google Calendar; a portal reschedule request still needs coordination through the original Google booking.

## Email journey
| Event | Applicant receives | Next action |
|---|---|---|
| Application saved | Receipt and, where needed, account setup | Set password or open applicant portal |
| Under review / shortlisted / waitlisted / decision | Stage update | Follow the message in the portal |
| Moved to Interview without a booked slot | Google booking link | Choose a slot using application email |
| Manual published interview | Time and joining instructions | Confirm or request another time |
| Calendar booking imported or rescheduled | Recorded booking details | Check details; no second confirmation |
| Published interview cancelled | Earlier invitation no longer active | Check portal and coordinate next step |
| Unconfirmed manual interview within 24 hours | Confirmation reminder | Confirm or request another time |
| Confirmed/eligible upcoming interview within one hour | Joining reminder | Join using recorded details |

Existing queue safeguards prevent sending a stale superseded update. Repeating a save with no applicant-facing change does not intentionally send another update. Delivery marked Sent means accepted by the email provider, not guaranteed inbox placement. No historical applications are bulk-emailed by this release.

## Verification limits
Automated unit, DOM and database tests cover the new flow alongside existing permissions and recruitment tests. Real Google account authorisation, Calendar event import and the user's deployed website still need the live checks above. Mobile projects are rebuilt/synchronised; this is not an App Store or Play Store release.

## Database advisory review
The Calendar ingestion function is intentionally callable with a scoped secret instead of a user session; configuration is restricted to verified administrators. Its private tables intentionally have no direct-access policies. The scanner flags these privileged entry points for review: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable . Null/invalid credentials and non-admin configuration were tested. Existing leaked-password protection is disabled and was not changed by this release: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

23 November follow-up: fixed the Calendar heartbeat and disconnect queries to include their singleton filter, preserving Supabase safe-update enforcement. Applied live; no Apps Script changes are required.


## Recruitment workspace update — 23 November 2026

- Interview desk: chronological upcoming bookings with department, assigned interviewers, joining link and applicant shortcut. Separate follow-up, awaiting-decision and awaiting-booking queues. Times use the viewer's browser time zone, labelled on screen.
- Application shortcuts open answers, existing scorecard, private outcome, onboarding and email history. Existing scorecards and department feedback are retained.
- Outcomes: completed, missed interview, rescheduling needed, or outcome not recorded. Required evidence; immutable history with actor and slot. Old-slot outcomes do not carry over to rescheduled interviews. Only verified administrator, Director and Assistant Director can record/read these outcomes. No automatic rejection, selection, cancellation or email from private outcome notes. Public stage changes retain existing email automation.
- Member welcome: clearer two-column reporting-person/responsibilities/tasks/document brief, existing next meeting and saved acknowledgement checklist. Mobile stacks these cards.
- Calendar: visible last contact, warning after 20 minutes without contact, refresh status and corrective guidance for booking exceptions. Email attention queue and existing safe retry/history retained.

### Deployment
The additive `scripts/interview-outcomes.sql` migration has already been applied to elan-v2 and permissions checked. Do not rerun it there. Replace website files using this complete package and push to GitHub as usual. Google Apps Script does not need changes. No applicant data was edited or test emails sent.

### Verification
Full release checks passed, including new DOM/unit coverage for agenda sorting/actions and new PostgreSQL tests for leadership permissions, non-leadership denial, slot matching, immutable history and actor spoofing prevention. Android/iOS web assets regenerated. An authenticated browser walkthrough of the deployed interface remains to be done after the GitHub deployment.
