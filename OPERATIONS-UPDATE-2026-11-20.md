# Élan operations and automatic email update

This is the later 20 November update. It supersedes the deployment instructions and interview-warning limitation in WEB-UPDATE-2026-11-20.md.

## Already applied to the hosted Élan database

Project: elan-v2 (`aptaodflhiopzjibyyzn`).

- Additive operations/workflow SQL and current-assignment notification checks.
- `elan-api` version 16: interview reminder email support.
- `elan-applicant-mail` version 3: existing applicant delivery plus workspace notifications.
- Existing once-per-minute cron remains active. No additional cron job or new credentials are needed.
- No test applicants, interviews, appointments or emails were created in production.

Do not rerun the old SQL files. The scripts in this package are included for source recovery and another environment; they are not instructions to reset the existing database. The ZIP contains the website/app source and assets, not a backup of hosted Supabase records.

## Publish the screens

Push this complete project through your existing GitHub deployment. Web output remains `dist/`. Keep your existing GitHub settings and secrets. The Android/iPhone web bundles have been synchronised; store distribution remains paused.

## What changed

- **Today:** personal open tasks, assigned upcoming interviews, revision/handoff shortcuts, recent notifications and email preferences.
- **Interviews:** duration, one or more assigned interviewers, actual overlap enforcement for shared interviewers, stale-edit protection, calendar downloads for staff and applicants. Existing interviews without structured interviewer assignments remain valid but must be assigned when next published through the new form. The conflicts filter retains a conservative same-time warning for legacy unassigned slots.
- **Revisions:** leaders can return pending submissions with a specific note. The author sees the original, edits fields and retains/replaces evidence. The replacement starts a fresh review and needs both leaders' approvals. The original remains in history and cannot be reopened for approval.
- **Handoffs:** a department can request work from another department with a brief and deadline. Receiving heads accept, start and deliver; the requesting author/head closes it. Leadership can manage the transitions. Existing partnership commitments remain separate and intact.
- **Delivery health:** admin overview and leadership Today show delayed, failed and uncertain workspace emails. Admin/leadership can retry known failed deliveries. Unknown SMTP outcomes are held rather than silently resent.

## Automatic emails

| Event | Who receives it |
|---|---|
| OC application submitted | Applicant acknowledgement/setup through the existing flow; admin, both leaders, HR and the first-choice department receive the new-application update |
| Applicant-facing stage/message/interview changes | Applicant through the existing protected tracker workflow; relevant recruitment staff receive a workspace update |
| Interview response | Applicant confirmation/reschedule acknowledgement; relevant recruitment staff receive an update |
| Interview reminders | Applicant: existing unconfirmed 24-hour reminder plus a 1-hour reminder unless rescheduling requested. Assigned interviewers and leadership: 24-hour and 1-hour reminders |
| Task assignment/progress | Assigned organiser, their department head and leadership/admin |
| Submission, decision or revision | Submitting organiser, relevant department head and leadership/admin |
| Handoff request/progress | Requesting organiser, the two department heads and leadership/admin |
| Approved/published briefing | Its authorised department audience plus leadership/admin |
| Open tasks/handoffs due or overdue | Relevant responsible people, once per day while outstanding |
| Submission pending over a day | Relevant submitter/head and leadership/admin, once per day while pending |

Routine notifications default to immediate. Organisers can choose a daily summary at 9 am IST in Today; admin can choose it in the overview delivery panel. Essential account/applicant messages and interviewer reminders stay immediate. Queued work is processed in bounded batches every minute, so delivery may take longer during a backlog.

Recipients are rechecked at send time. Removed accounts and obsolete department assignments lose access to their former notifications. Email bodies contain short update titles and portal links, not application answers, financial evidence or private review notes. A change to a private reviewer note alone does not email the applicant. Content edits to the public website do not broadcast an email to every registered user.

Each event/reminder has a deduplication key. Known delivery failures retry at 15-minute intervals up to five attempts; uncertain deliveries do not automatically retry. Provider acceptance is recorded as Sent; inbox delivery and spam placement cannot be guaranteed. The new automation does not replay every historical application or change.

## Verification

`npm run check` runs preservation/build checks, unit tests, DOM interaction tests and PostgreSQL tests. Added coverage includes interval overlaps, adjacent slots, stale edits, role denials, handoff transitions, revision history/approval isolation, scoped notifications, revoked access, digest timing, uncertain delivery, retained failed form entries and safe calendar text.

A local synthetic Today screen was reviewed in the browser. This was not a new real-device acceptance test. After your GitHub deployment, open Today in an existing organiser account and the email delivery panel in admin, then use a real scheduled interview when appropriate to confirm the full user journey.
