# Recruitment team tools — 17 November 2026

## Installed on the live backend

Migration `elan_recruitment_team_tools` and `elan-applicant-mail` version 2 are live on elan-v2. No SQL needs to be run for this update. Upload this complete source-build package to the existing website repository to activate the new screens. Keep src/scripts/dist in their existing locations. Do not run fresh-project.sql or replay historical upgrades.

## Added

- Individual interview scorecards: department fit, communication, reliability and initiative, scored 1–5 with written evidence and a recommendation. Each reviewer edits only their own scorecard. Other authorised reviewers can read it. Previous shared interview feedback remains available unchanged.
- Review owner and a local-time due date. Current verified admin/Director/Assistant Director accounts can be assigned. Assignments do not grant permissions. Concurrent changes are rejected rather than silently overwriting another reviewer's save.
- Overdue reviews queue, excluding selected/not-selected applications. This is based on an explicitly saved due date, not an invented response-time promise.
- Daily admin email alert when applicant update messages are failed, uncertain, or pending for more than 30 minutes, or acknowledgement delivery has failed/is unconfigured. No applicant personal details are included. One claim per verified administrator per India calendar day prevents repeated alerts every minute.
- Responsive two-column scorecards on desktop and single-column mobile layout, visible keyboard focus, readable wrapping and minimum button sizes.

Applicant withdrawal remains unavailable. Final selection/deletion/access management remains admin-only. Saving a scorecard or owner assignment is private and does not email the applicant. Public stage/interview updates retain the existing email process.

## Verification

80 unit tests passed, plus four DOM interaction suites and five local PostgreSQL suites. Build/route/content/SEO checks passed: 55 pages, all 37 original routes retained, image/favicon/legal preservation checks passed.

Live Assistant Director read check: recruitment access true, three eligible reviewers and 18 applications visible. An unauthorised identity cannot read the new review data. Table writes are RPC-only; reviewer identity is obtained from the authenticated session, never from client input.

The live scheduled worker returned HTTP 200 with one admin alert accepted and no alert failures; its following run sent no duplicate. Provider acceptance does not confirm inbox placement.

## Remaining verification limits

The local browser preview was blocked by the environment (`ERR_BLOCKED_BY_CLIENT`). Mobile CSS and DOM checks are complete, but visual browser approval is not claimed. A real inbox-based application → password setup → interview confirmation → appointment journey was not performed in this update; local regression suites cover those components. Do a pilot using an inbox you control after uploading.

The existing uncertain applicant email was not retried. Reconcile it with the sender/recipient before any resend. Daily alerts use the same email provider as applicant mail; a complete provider outage may block alerts too. Claims prevent automatic same-day retries of uncertain alert sends; the next day's digest can retry notification if issues persist. If the worker itself stops, the dashboard health indicator reports the stale heartbeat, but this same-worker alert cannot report its own outage.

Existing Supabase advisory: leaked-password protection is disabled. This is an Auth dashboard setting, not changed here. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Private worker-health/alert-claim tables intentionally deny direct access through RLS; their no-policy info notices are expected.
