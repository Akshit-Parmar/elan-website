# Recruitment dashboard, feedback and onboarding

## Activate this release

Keep your existing project and data. This is an additive upgrade.

1. Install the preceding applicant email upgrade and status fix as described in DEPLOY-FIRST.txt and APPLICANT-AUTOMATED-EMAILS.md. If already installed, do not run their table-creation scripts again.
2. Run `scripts/recruitment-readiness.sql` once in the existing project's Supabase SQL Editor. It adds private interview feedback and member onboarding tables with access policies.
3. Redeploy `elan-api` with its shared modules to enable the new failed-email retry action. Keep the existing scheduled applicant mail worker active.
4. Deploy the updated website through your usual GitHub/Cloudflare workflow.

## In Admin → OC applications

The top dashboard provides clickable queues for awaiting review, upcoming interviews, unanswered invitations, rescheduling requests and failed/uncertain update emails. Search and department filters remain available. Every applicant card shows the latest recruitment-update email status; the original receipt status is shown inside the application.

Open an application to save **Private interview feedback**: interviewer, department fit, availability, skills, recommendation and comments. These records are private to the administrator and, after the leadership upgrade, the Director and Assistant Director. A recommendation is not a recruitment decision and never automatically selects or rejects anyone.

Use **Prepare their first day** to save a reporting contact, responsibilities, first tasks with deadlines and required documents/submission instructions. You can prepare this while reviewing the application. It appears only after selection and organiser access activation. Do not put sensitive assessment notes in this brief.

Select the applicant through the existing stage and approved-department controls. Members see **Start here** at login and can return to it from their workspace navigation. Existing task assignment and briefing tools remain available. Onboarding task instructions do not automatically create task-board records; department heads can assign tracked work using My tasks/Team tasks.

Use **Retry failed email** in application email history for definitively failed recruitment emails. The server checks admin permissions, rechecks that the row is still failed, applies rate limits and records an audit entry. Stale messages are cancelled by the sender. Sent, sending and uncertain messages cannot be retried through this control. Fresh applicant setup links and original receipt retries retain their existing separate controls.

No applicant withdrawal action, route or permission has been added. Existing administrator-only application deletion remains unchanged.

## Verification and live pilot

Completed locally:

- 72 automated tests covering email content and dispatch, invitation acceptance/invalid links, wrong-portal access, account operations, status handling and dashboard queues.
- DOM interaction test: actual admin review page, Under review without a time, failed-email retry, feedback save and onboarding save.
- PostgreSQL tests: recruitment email queue, interview changes and reminders, applicant responses, stale publication flag; feedback access restrictions; onboarding visibility after selection; other-user denial and access revocation.
- Website build, preserved-route checks and module resolution checks.

These are isolated checks, not a claim that the live Supabase settings or inbox delivery are working. Complete this pilot after deployment using an inbox you control:

| Step | Expected result |
| --- | --- |
| Submit OC application | One saved application; receipt/setup email; applicant tracking link |
| Open newest setup link | Your live domain, not localhost; set password; applicant portal opens |
| Open an expired link | Clear error and a recovery route; no wrong account session |
| Save Under review with no interview | Saves successfully; portal updates; one relevant email |
| Add private feedback | Admin sees it; applicant does not; no applicant email |
| Publish a future interview | Time and instructions visible; invitation email |
| Request another time | Admin reschedule queue updates; applicant receives acknowledgement |
| Change interview time | New invitation; old pending invitation/reminder superseded |
| Confirm interview | Confirmation recorded; unanswered reminder suppressed |
| Save onboarding and select department | Correct organiser role/department; personal brief in Start here |
| Try participant/admin portals as member | Access denied with the correct portal destination |
| Reject a separate test application | Decision shown and emailed; no organiser access |
| Simulate provider rejection in a test project | Failed state; admin retry works after correction |

Do not test rejection on real candidates or deliberately break production email credentials. Monitor Cron and Edge Function logs if messages stay queued. “Sent” means the provider accepted the email, not guaranteed inbox placement.

For reproducible extended local tests, install @electric-sql/pglite@0.5.16 and jsdom@26.1.0 in an isolated test environment, then run tests/recruitment-readiness-postgres.mjs and tests/recruitment-readiness-dom.mjs. Neither sends real email. Keep node_modules outside the deployment ZIP.
