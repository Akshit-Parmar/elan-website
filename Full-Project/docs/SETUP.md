# Setup and handover

## 1. Existing Supabase project

The existing project is `aptaodflhiopzjibyyzn`. The initial content tables, application migrations and `elan-api` Edge Function have already been deployed. **Do not rerun `fresh-project.sql` on this populated project.** Source migrations record the applied changes.

The frontend uses only the publishable key in `src/public-config.json`. Privileged credentials are never embedded in the browser. The API receives `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the hosted Edge Function runtime.

## 2. New empty Supabase project

1. Create a project in your own Supabase account.
2. Run `python scripts/configure.py --url https://YOUR_PROJECT.supabase.co --publishable-key YOUR_PUBLISHABLE_KEY --origin https://YOUR_WEBSITE`.
3. Run `python scripts/assemble-database.py` to refresh the SQL package after configuration.
4. In the SQL editor for the new empty project, run `supabase/fresh-project.sql` once. It installs the baseline content, application tables, functions, policies, storage buckets and the six guest profiles. It is a clean-install script, not an upgrade or backup restore.
5. Authenticate the Supabase CLI to your account. Deploy `supabase/functions/elan-api/` with the CLI's `functions deploy elan-api --project-ref YOUR_PROJECT --no-verify-jwt` command (check `supabase functions deploy --help` for your installed version). The function implements its own user-token verification and webhook signature verification; the public enquiry route is intentionally available without an account.
6. Configure secrets described below, then rebuild and deploy `dist/`.

Local Supabase development is also possible with `supabase start`; because the migration folder contains upgrades from an existing baseline, load `scripts/content-schema.sql` before applying these migrations to a new local database. Use `fresh-project.sql` as the simpler complete bootstrap instead of blindly running `db reset` on an unprepared local project.

## 3. Email authentication

In Supabase Authentication → URL configuration:

- Site URL: your actual HTTPS website origin.
- Redirect URLs: `https://YOUR_WEBSITE/portal/index.html` and `https://YOUR_WEBSITE/portal/set-password.html`.
- For local development: `http://localhost:8000/portal/index.html` and `http://localhost:8000/portal/set-password.html`.

Enable email/password sign-in and email confirmation. Configure your SMTP provider for actual user delivery; Supabase's default email service has restrictions. Keep the built-in verification link in the confirmation/recovery templates. This frontend uses PKCE, so verification should be opened in the browser that requested the email. Test sign-up, confirmation, sign-in, recovery, logout and expired links using accounts you own before a public launch.

## 4. First administrator and organisers

Create your own account through `/portal/login.html`, verify its email, and sign in. A new account is a participant by default. In the SQL editor, replace the placeholder email in `scripts/bootstrap-admin.sql` with your approved verified account email and run it. Never run a blanket role grant.

The same `elan_staff` table grants `organiser` for check-in, enquiries, support and reading operational records. Only `admin` can edit published content, prices and registration settings or allocations. Roles are checked from the database on each API request, not from user-editable signup metadata. To revoke staff access, delete that user's `elan_staff` row; their participant account remains.

The application intentionally does not provide a self-service browser role-grant endpoint. Staff provisioning is an owner operation in Supabase.

## 5. Backend secrets

Use Supabase Edge Function secrets, never frontend configuration:

- `ALLOWED_ORIGINS`: comma-separated website origins; include the actual production origin. The default currently includes the existing Sites URL and local QA origins. Remove unused origins before public launch.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: from your own merchant account, using test credentials first.
- Optional `TURNSTILE_SECRET_KEY`: if enabled, add the matching public `turnstileSiteKey` to `src/public-config.json`. Public enquiry submissions are already rate-limited by hashed email/IP; Turnstile adds stronger bot resistance.

A template is included at `supabase/.env.example`. CLI secret upload must use your authenticated local session, never a committed `.env` file. No paid service or merchant account was created by this build.

## 6. Registration launch

In `/admin.html`:

1. Edit the next edition: name, dates, venue, published status.
2. Edit registration settings: capacity, age limits, deadline, price in paise, participation terms and terms version.
3. Review the policies for the new edition. The four original policy pages are preserved as 2026 archive material; they are not represented as updated legal terms for an independent future event.
4. Test an individual and a school registration, confirmation and cancellation in your staging environment.
5. Open registration only when the settings are ready. The server rejects attempts while closed and checks eligibility/capacity again in a transaction. Pending registrations consume capacity; organisers can cancel unpaid pending records. A payment order prevents automatic cancellation until reconciled.

Free registrations await administrator confirmation. Paid registrations are confirmed only after a matching captured payment is verified. Each registration preserves the accepted terms text/version and amount; subsequent price changes do not rewrite an existing registration.

## 7. Payments

The supplied adapter uses Razorpay, not the historical Easebuzz account. Confirm your chosen provider before live launch. The adapter creates orders on the server and uses the server-stored registration amount in INR. Browser success alone never marks a registration paid.

Webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/elan-api/webhook`.
Configure the `payment.captured` event and its webhook secret. Test checkout, invalid signatures, wrong amounts, duplicate delivery and delayed capture. The handler verifies the exact raw-body signature and fetches the payment from Razorpay to check order, amount, currency and captured status. A matching payment is applied transactionally and idempotently.

An ambiguous order-creation timeout leaves the payment in `creating`, intentionally preventing a second charge attempt. Reconcile its stored payment ID/receipt in the provider dashboard before an owner updates the record. Do not blindly reset it and create another order.

Refunds, chargebacks and disputes must currently be managed and reconciled through the merchant dashboard. They are not automated by this implementation, and the API does not initiate refunds. Update relevant payment and registration records only after verifying the provider outcome. The frontend is not an accounting ledger or tax-invoice generator.

## 8. Media and reports

- `elan-public-media`: public JPEG/PNG/WebP assets, max 8 MB. Admins obtain signed upload URLs and then publish guest/gallery records. Uploaded files are publicly retrievable by URL even while their content record is draft.
- `elan-submissions`: private PDF reports, max 10 MB. An authenticated registration owner receives a signed upload URL within their own folder. Downloads require ownership or staff access and expire after 120 seconds.
- Browser database roles cannot directly write to these tables or storage buckets. The server checks each action.
- Failed uploads or abandoned form saves can leave unreferenced objects; review these periodically before removing them. No automated object cleanup or malware scanning has been configured.

## 9. Data retention and backup

The ZIP includes public edition/media/guest seed data, not future participant or enquiry records. Supabase database backups, Auth exports and Storage object backups need your account's backup process. Do not treat this ZIP as an ongoing database backup. Define retention for enquiries, reports, registrations and audit/rate-limit rows before collecting live event data. No outbound announcement emails or SMS are sent automatically; users see announcements and support replies in their portal.

## 10. Hosting

Run `python scripts/build.py` and `python scripts/verify.py`, then deploy `dist/`. Serve the site over HTTPS. Run `python scripts/configure.py` when changing the public Supabase project or website origin. Keep `.env`, service keys and database credentials outside `dist/`. The original `reference/v1` source must not be deployed: it is historical and includes legacy integrations.
