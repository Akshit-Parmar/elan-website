# Élan 2026 — Easebuzz payment flow

## What happens now (frontend — live after you push)
1. Visitor fills the registration form on `tickets.html` and picks a ticket.
2. On submit, the registration is saved to Supabase `registrations` with the
   default status **`pending`** (the browser never marks it paid).
3. The visitor is redirected to the correct Easebuzz QuickPay page for their tier:

   | Ticket (option `data-tier`) | Easebuzz link |
   |---|---|
   | Early Bird (`early`)        | https://easebuzz.in/quickpay/wnlgprhsin |
   | Standard (`standard`)       | https://easebuzz.in/quickpay/sdjimhdnec |
   | Late Registration (`late`)  | https://easebuzz.in/quickpay/kjeyakunzo |
   | School Delegation (`school`)| https://easebuzz.in/quickpay/nmzjbrnpfc |

The link map lives in `public/assets/js/main.js` (`EASEBUZZ_LINKS`).

## What confirms a registration (server-side — the "only after payment" rule)
A registration becomes **`paid`** in exactly one of two ways. Never from the browser.

### Option A — automatic (recommended): Easebuzz webhook
`supabase/functions/easebuzz-webhook/index.ts` verifies Easebuzz's reverse hash,
and only on a verified `success`:
1. marks the matching **pending** registration `paid` (matched by payer email,
   most recent pending), then
2. calls `issue-participant?path=admin` → mints the `ELAN26-####` UID, creates the
   Supabase Auth user, and emails the set-password link.

Setup:
1. Deploy: `supabase functions deploy easebuzz-webhook`
2. Secrets:
   ```
   supabase secrets set EASEBUZZ_KEY=... EASEBUZZ_SALT=... \
     ISSUE_FN_URL=https://<project>.functions.supabase.co/issue-participant \
     ADMIN_ISSUE_SECRET=<same secret issue-participant uses>
   ```
   (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.)
3. In the **Easebuzz dashboard**, set the account **Webhook / success callback URL** to:
   `https://<project>.functions.supabase.co/easebuzz-webhook`

Caveat: QuickPay pages collect the payer's email on Easebuzz's side. Matching is
by email + most-recent-pending, so a payer must use the **same email** they
registered with. Verify the exact reverse-hash field order against your Easebuzz
integration docs (the function uses the standard PayU-style order; QuickPay may
omit some `udf` fields, handled as empty strings).

### Option B — manual fallback (works today, no webhook needed)
Check successful payments in the Easebuzz dashboard, then in Supabase set that
registration's `status` to `paid`. That alone is your record; to also issue the
portal UID + email, call `issue-participant?path=admin` with the `registration_id`
(see the portal integration notes). Use this until the webhook is wired.

## Notes
- No Easebuzz keys/secrets are in the frontend — only the public QuickPay URLs,
  which are meant to be shared.
- If a visitor abandons payment, their registration simply stays `pending` and can
  be cleaned up or followed up.
