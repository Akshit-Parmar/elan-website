# Élan 2026 — Setup Guide (from scratch)

Follow these in order with your new email. Each phase ends with a check so you
know it worked before moving on. Everything (ticket tiers, prices, schema) is
already built into this bundle — you're just creating accounts and connecting them.

---

## Phase 0 — Get the code ready
1. Unzip this bundle into an empty folder, e.g. `Documents\elan-website`.
2. That folder is your project. It contains `public/`, `supabase/`, and a few
   loose files. **Don't rearrange anything.**

---

## Phase 1 — GitHub (account + empty repo)
1. Go to github.com → sign up with the new email → verify it.
2. (Optional) create an organisation if you want the repo under a team name.
3. Click **New repository**.
   - Name: `elan-website`
   - **Private**
   - **Do NOT** tick "Add a README", ".gitignore", or a licence (leave the repo empty).
4. Create it. Leave the page open.

✅ Check: you have an empty private repo named `elan-website`.

---

## Phase 2 — Push the code (GitHub Desktop, no command line)
1. Install GitHub Desktop from desktop.github.com → open it → sign in with the
   new account.
2. **File → Add local repository** → browse to your unzipped folder.
   - Pick the **top folder** (the one containing `public` and `supabase`) —
     NOT `public` itself.
   - It'll say "this directory is not a Git repository" — that's normal. Click
     **create a repository** → **Create repository**.
3. Bottom-left, type a summary `Initial Élan site` → **Commit to main**.
4. Top bar → **Publish repository**. Name `elan-website`, keep **private**,
   pick your account/org → **Publish**.

✅ Check: refresh GitHub in the browser — your files are there.

---

## Phase 3 — Supabase (database)
1. Go to supabase.com → sign up with the new email.
2. **New project**:
   - Name: `elan`
   - Database password: generate one and **save it somewhere**.
   - Region: **Southeast Asia (Singapore)** — closest to India.
3. Wait ~2 minutes for it to finish provisioning.
4. Left sidebar → **SQL Editor** → **New query**.
5. Open `supabase/migrations/0001_init.sql`, copy **everything**, paste, **Run**.
   - On a fresh project this runs clean with no errors. (If you ever see
     "policy already exists", it means the DB isn't empty — don't re-run it.)
6. Get your two keys:
   - **Settings → API Keys → "Legacy anon, service_role" tab** → copy the
     **anon `public`** key (starts with `eyJ...`). Use this legacy key, not the
     newer `sb_publishable_...` one — the site code expects the `eyJ...` format.
   - **Settings → Data API** (or General) → copy the **Project URL**
     (`https://xxxxx.supabase.co`).

✅ Check: run `select count(*) from ticket_types;` → returns 4.

---

## Phase 4 — Wire the keys into the site
1. On your PC, open `public/assets/js/config.js` in Notepad.
2. Replace the two placeholders (keep the quotes):
   - `SUPABASE_URL` → your Project URL
   - `SUPABASE_ANON_KEY` → your anon `public` key
3. Save. In GitHub Desktop: summary `Add Supabase keys` → **Commit to main** →
   **Push origin**.

✅ Check: GitHub Desktop shows "No local changes" after pushing.

---

## Phase 5 — Cloudflare (hosting)
1. Go to dash.cloudflare.com → sign up with the new email → verify.
2. **Register your workers.dev subdomain FIRST** (this is the step that blocks
   deploys if skipped). Paste this into the browser:
   `https://dash.cloudflare.com/?to=/:account/workers/subdomain`
   Pick a name (e.g. `elan-official`) → save. Your site will live at
   `elan-website.<that-name>.workers.dev`.
3. **Workers & Pages → Create → Import a repository** → connect GitHub, authorise
   the new account and the `elan-website` repo → select it.
4. Settings: Build command **empty**, Root directory `/`. It reads `wrangler.jsonc`
   automatically. → **Deploy**.
5. When it finishes, open the Worker → **Settings / Domains**. If the
   `workers.dev` URL shows "Previews Only", toggle the production URL **on**.

✅ Check: open `https://elan-website.<subdomain>.workers.dev` — the site loads.

---

## Phase 6 — Verify end to end
1. Open the live site on desktop and phone; click through the pages.
2. Tickets: Select buttons are greyed until 12 July — that's correct. They
   activate automatically on their dates.
3. Fill the Contact form and submit. In Supabase → **Table Editor →
   contact_messages**, your row should appear. That proves the whole chain works.

---

## Before registrations open (don't skip)
- Upgrade Supabase to **Pro** (~2 weeks before 12 July). The Free plan has no
  backups and pauses after 7 days idle — not acceptable once real signups land.
- Add **Cloudflare Turnstile** to the forms (free) to stop spam.

## Future (Phase 2)
- Razorpay checkout for live ticket payment. Schema is ready (`orders`,
  `tickets`, `ticket_types` with prices + sales windows).
