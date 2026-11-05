# Verification record — 23 October 2026

## Passed

- Build and local link/asset checks: all 37 original routes retained; 46 generated pages.
- Original logo/favicons and original four legal main bodies remain unchanged.
- Node tests: invalid participant payloads; unsafe CMS image URLs; order/amount/currency/capture checks; exact raw webhook HMAC and tamper rejection.
- Hosted database tests in a rolled-back transaction: ownership isolation; anonymous denial; role-escalation denial; service-only payment RPC; age, consent and capacity rejection; registration idempotency; single payment-order claim; cancellation guard; captured-payment amount matching; duplicate webhook handling.
- Supabase security advisor: no lints after the migrations.
- Deployed API probes: health 200, missing-auth dashboard 401, missing-auth admin list 401, unsigned webhook 401, malformed public enquiry 400.
- Browser: real signed-out account page rendered. Isolated local data fixtures exercised mobile registration, adding a school delegate, organiser record lists, opening guest editing, and participant dashboard. Registration and admin page widths stayed within a 375px content viewport. Two discovered frontend bugs were fixed before export.

## Not verified end-to-end

- Live email delivery, confirmation, recovery, authenticated user/administrator sessions, storage uploads and real merchant checkout. These require owner-approved accounts and external configuration.
- Automatic approval review rejected creating persistent privileged test accounts. No such accounts were created. Transactional database tests were rolled back; browser test fixtures were local-only and removed before packaging.
- Deno type checking could not fetch its npm dependency in this executor. The function transpiled and deployed successfully; this does not substitute for full static type checking.
- Payment-provider success paths are validated with unit/database tests, not a real test-mode checkout. Refunds and disputes are documented manual operations.
- This is a substantial backend implementation, not a claim of a completed independent security audit or a fully operational public event launch.
