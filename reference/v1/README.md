# Élan 2026 — Event Website

Premium student-led inter-school summit · 5–6 September 2026 · SGI Pune Campus.
Static multi-page site (HTML/CSS/vanilla JS) with a Supabase backend for the
four intake forms, deployed on Cloudflare Workers (static assets).

## Stack

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Frontend   | Static HTML/CSS/JS in `public/` (no build step)               |
| Database   | Supabase (Postgres + RLS). Free for dev → **Pro before registrations open** |
| Hosting    | Cloudflare Workers — static assets, free tier                 |
| Payments   | Razorpay (Phase 2 — capture-first for now)                    |

## Repository layout

```
public/                    # everything served to the browser
  *.html                   # 17 pages
  assets/css/styles.css
  assets/js/main.js        # nav, countdown, validation, + form → Supabase inserts
  assets/js/config.js      # PUBLIC Supabase URL + anon key (safe to commit)
  assets/img/
supabase/
  migrations/0001_init.sql # 4 tables + insert-only RLS + grants
wrangler.jsonc             # Cloudflare Workers static-assets config
.env.example               # SECRET values (Phase 2) — never committed
```

## The four database-connected forms

| Page              | `data-form`     | Table                     |
|-------------------|-----------------|---------------------------|
| `tickets.html`    | `registration`  | `registrations`           |
| `contact.html`    | `contact`       | `contact_messages`        |
| `schools.html`    | `school`        | `school_inquiries`        |
| `volunteers.html` | `volunteer`     | `volunteer_applications`  |

Submissions **write** to Supabase but cannot be **read** from the browser —
RLS grants insert only. The team reads submissions in the Supabase dashboard.

## Setup (one-time)

### 1. Supabase
1. Create a project (Free plan is fine for now).
2. **SQL Editor** → paste `supabase/migrations/0001_init.sql` → Run.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.
4. Paste both into `public/assets/js/config.js`.

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Élan site: Supabase-connected forms + Cloudflare deploy config"
git branch -M main
git remote add origin <YOUR-REPO-URL>
git push -u origin main
```

### 3. Deploy on Cloudflare
- Dashboard → **Workers & Pages → Create → Import a repository** → pick this repo.
- Framework preset: **none**. Build command: **none**. It reads `wrangler.jsonc`
  and serves `public/`. Every push to `main` redeploys.

## Before registrations open (do not skip)
- **Upgrade Supabase to Pro** (~2 weeks before). The Free plan has *no backups*
  and pauses after 7 days idle — unacceptable once real registrations exist.
- **Add Cloudflare Turnstile** to the four forms (free). The honeypot in place
  now stops naive bots; Turnstile stops the rest without hurting UX.

## Phase 2 — payments (Razorpay)
Schema is already payment-ready (`razorpay_order_id`, `razorpay_payment_id`,
`paid_at`, `status`). Add a Supabase Edge Function (or a Worker under `main`)
that (a) creates the Razorpay order with an amount **recomputed server-side**
from a trusted price table — never the browser's `amount` — and (b) verifies
the payment webhook signature before flipping `status` to `paid`.

## Local preview
Any static server works, e.g. `npx serve public`. For a Workers-accurate
preview: `npx wrangler dev`.
