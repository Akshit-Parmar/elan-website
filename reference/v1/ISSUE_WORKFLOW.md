# Élan — Issuing IDs & passwords from the school's paid list

The school only gives you **names + amounts** of who paid. That's enough, because
you already hold each person's email from your own registration form. Here's the flow.

## One-time setup (Supabase dashboard)
1. Deploy two Edge Functions (Edge Functions → Create):
   - `issue-participant`  (mints UID + login + set-password email)
   - `admin-issue-batch`  (matches the paid names and issues them in bulk)
   Deploy `admin-issue-batch` with **JWT verification OFF** (so the admin page can call it).
2. Secrets (Edge Functions → Secrets):
   - `ADMIN_ISSUE_SECRET`  — a long random string you invent
   - `ISSUE_FN_URL`        — the issue-participant URL, e.g.
     `https://<ref>.functions.supabase.co/issue-participant`
   - `RESEND_API_KEY`      — from resend.com, so the set-password emails actually send
   - `PORTAL_BASE_URL`     — your live site (used in the email link)
3. Auth → URL Configuration: add `https://<your-site>/portal/set-password.html`
   as an allowed redirect.

## Every time the school sends a new paid list
1. Open `https://<your-site>/admin.html` (keep this URL and the secret private).
2. Paste the list — one name per line. Add the amount after a comma if you have it
   (helps when two people share a name):
   ```
   Riya Sharma, 4199
   Arjun Mehta
   ```
3. Enter the Function URL (pre-filled) and your `ADMIN_ISSUE_SECRET`, click **Match & issue**.
4. Read the report:
   - **Issued** — marked paid, UID minted, set-password email sent. Done.
   - **Already issued** — was done in a previous run (safe, nothing duplicated).
   - **Needs review** — that name matched more than one registration; add the amount
     or fix it by hand in the `participants`/`registrations` table.
   - **Unmatched** — no pending registration with that name (a typo, or they never
     registered on the site). Check spelling with the person.

It's safe to re-run the same list — already-issued people are skipped.

## Security note
`admin.html` is gated only by the secret you type in. Keep the URL and the secret
private, and use a long random secret. If you want it locked behind a proper admin
login instead, say so and I'll add that.
