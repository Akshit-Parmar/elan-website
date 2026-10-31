# Élan 2026 — Participant Portal (integrated into your repo)

This is your existing site with the paid-participant portal added **in place**.
The public promo site is unchanged except for the schedule removal + a Login link.
Nothing was rebuilt, renamed, or restyled.

## What changed in your existing files
- **Every public page** (`public/*.html`): removed the **Schedule** link from the
  pill navbar and the footer; added a **Login** link (→ `portal/login.html`) after
  Contact; repointed the few in-body "schedule" buttons to `event-details.html`.
- **Deleted** `public/schedule.html` — the detailed public schedule is gone, and no
  direct URL survives. Its real Day 1/Day 2 content was migrated into the DB
  (see `0003_portal_seed.sql`) so it now lives only inside the portal.

## What was added
**Portal pages** — `public/portal/`: `login.html`, `set-password.html`,
`dashboard.html`, `ticket.html`, `portal-schedule.html`, `participant-guide.html`,
`flagship.html`, `announcements.html`, `help-desk.html`, `profile.html`.
They reuse your real `styles.css` components (`.site-nav`, `.page-hero`,
`.white-card`, `.schedule-card`, `.field`, `.btn`…) and your `main.js` (the portal
nav is injected with the same classes, so the mobile toggle, sticky behaviour, and
page transitions all work exactly as on the public site).

**Shared assets** — `public/assets/`: `js/portal.js` (guard + nav/footer inject +
data rendering), `js/auth.js` (login/logout/set-password), `css/portal.css` (only
the credential-pass, QR, and state styles — everything else is your existing CSS).
Reuses your existing `assets/js/config.js` (no second config, no new keys).

**Backend** — `supabase/`:
- `migrations/0002_participant_portal.sql` — `participants` (FK'd to your real
  `registrations`/`orders`), the `ELAN26-####` UID (minted once, immutable),
  `portal_announcements`, `portal_schedule_items`, `participant_documents`,
  `teams`, `team_members`, and all RLS.
- `migrations/0003_portal_seed.sql` — the "Portal is live" announcement + your
  **real 24-session Day 1/Day 2 schedule** now stored privately.
- `functions/issue-participant/index.ts` — the only paid-participant creator
  (Razorpay webhook + admin fallback + branded email).

## Deploy
1. **DB:** run `0002` then `0003` in the Supabase SQL editor (or `supabase db push`).
2. **Auth:** enable email/password; in Auth → URL Configuration add
   `https://<your-site>/portal/set-password.html` as an allowed redirect.
3. **Edge Function:**
   ```
   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
     RAZORPAY_WEBHOOK_SECRET=... ADMIN_ISSUE_SECRET=... RESEND_API_KEY=... \
     PORTAL_BASE_URL=https://<your-site>
   supabase functions deploy issue-participant
   ```
   (All secrets are server-side only — none touch the browser. Your public
   `config.js` still holds just the anon key.)
4. **Static site:** deploy as usual — `wrangler.jsonc` already serves `./public`,
   and the new `portal/` folder ships with it. No config change needed.

## Issue a participant today (pre-Razorpay)
Mark a registration paid, then call the admin path:
```
POST /functions/v1/issue-participant?path=admin
  header: x-admin-secret: <yours>
  body:   {"registration_id":"<a paid registration id>"}
```
→ creates the participant + UID, creates the Auth user, emails the set-password
link. When Razorpay goes live, point its `payment.captured` webhook at
`?path=razorpay` (pass `registration_id` in Razorpay `notes`) and issuance becomes
automatic. Payment is never trusted from the browser on either path.

## Test checklist
Public site loads unchanged · navbar shows **Login**, no Schedule · old
`/schedule.html` 404s · `portal/login.html` opens · logged-out hitting any portal
page redirects to login · unpaid/absent participant → "Access not active yet" ·
paid participant sees dashboard, ticket, schedule (from DB), announcements, guide,
flagship, help desk, profile · UID shows on Dashboard/Ticket/Profile and is
read-only · logout returns to the public site · mobile hamburger works · existing
registration/ticket forms still submit.

## Two honest notes
- **Guide / Flagship / Help-Desk** ship as static content inside login-guarded
  pages (fetchable by URL if guessed). The **schedule and announcements are
  DB-only** per your hard rule. Say the word and I'll move the other three behind
  the same RLS too.
- **QR** on My Ticket is a styled placeholder showing the UID; a real scannable QR
  can be generated client-side (a small lib) or server-side when you want it.
