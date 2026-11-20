> Later update: see OPERATIONS-UPDATE-2026-11-20.md for the current deployment status, structured interview scheduling and automatic email changes.

# Élan website update — 20 November 2026

## Changes

- Homepage: Explore the event, Apply for OC and Track application are together near the introduction. Existing partnership links, event sections and the unannounced date/venue wording remain.
- Applicant desk: compact profile, separate stage guidance and latest team message, interview-specific next steps, clearer spacing and keyboard focus. Refresh failures preserve the loaded page. Failed interview responses retain inputs. Unsaved interview notes block refresh. Successful saves remain correctly reported if the following read fails.
- Department desks: direct application shortcuts for the member's department; HR's shortcut says all applications. Existing server permission checks remain authoritative. Department save forms now show progress, retained-error feedback and success acknowledgement.
- Admin overview: review queue, email problems, same-time interviews and overdue review assignments. Summary failure leaves other admin tools usable. Existing editing sections and department workload summary remain.
- Recruitment workspace: a filter for future published interviews with identical start times. This is a scheduling warning, not a full overlap detector: interview duration and interviewer calendars are not structured fields in the current model.
- Existing invite, wrong-portal, email queue, review, selection, department and HR workflows retained. No applicant withdrawal added.
- App notes corrected: the iPhone API origin was enabled in live version 15 previously. App-store distribution remains paused.

## Checks

Run `npm run check` for build, original-route/image/legal preservation, module/search checks, unit tests, browser-DOM tests and local PostgreSQL permission tests. New regression coverage includes retained form inputs, refresh errors, successful-write/failed-read handling, escaped applicant messages, recruitment priority counts and exact-time interview collisions.

Desktop browser review used the local homepage, OC entry page and a synthetic applicant layout. No real applicant was created or emailed, and no real interview or appointment was changed. This is not a new live end-to-end email-delivery or real mobile-device acceptance test.

## Deployment

Use the complete project with the existing GitHub deployment process; web output remains `dist/`. This update requires no new SQL migration and no Edge Function deployment. Do not rerun old SQL scripts. The ZIP is the source package, not a database backup. Existing hosted data remains in Supabase.

After deploying, check homepage tracking, an applicant's existing status page, the admin overview and a department shortcut in your normal accounts. Existing server role restrictions, final appointment authority and dual approvals have not been broadened.
