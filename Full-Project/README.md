# Élan Summit — full application source

This project includes the redesigned website, a Supabase-backed application, database setup, Edge API, private report storage, content administration and a Razorpay payment adapter.

## Run the website

Python 3 is sufficient to serve the prebuilt site:

```sh
python -m http.server 8000 --directory dist
```

Visit http://localhost:8000. On Windows, `py` can replace `python`. Do not double-click HTML files: navigation uses root-relative URLs.

Edit `src/` and `scripts/application_pages.py`, then run:

```sh
python scripts/build.py
python scripts/verify.py
node --test tests/backend.test.mjs
```

The browser Supabase SDK is vendored in `src/vendor/` (v2.118.0); its license is included. No npm install is needed to run the supplied frontend. The API imports the same version through Deno's npm support.

## Main folders

- `dist/`: deployable frontend, including all photographs, logos and favicons.
- `src/`: editable page fragments, styles, JavaScript and assets.
- `scripts/`: build, verification, configuration, content seed and first-admin bootstrap.
- `supabase/functions/elan-api/`: server API, validation and payment verification.
- `supabase/migrations/`: database changes applied to the existing project.
- `supabase/fresh-project.sql`: complete initial setup for a NEW EMPTY Supabase project.
- `supabase/config.toml`: local Supabase configuration; hosted Auth settings must be configured separately.
- `docs/SETUP.md`: setup, administration and launch configuration.
- `docs/VERIFICATION.md`: checks actually performed and their limits.
- `tests/`: payment/validation tests and transactional database security tests.
- `reference/v1/`: original website source retained for parity, not active or deployable production code.

## Included application features

Email/password sign-up, sign-in, email confirmation, recovery and password update; editable profiles; individual and school delegation registration; immutable accepted-terms and fee snapshots; server-enforced age, capacity and closure checks; participant dashboard; country/cabinet/role allocations; attendance check-in; announcements and schedule; private PDF submissions and time-limited downloads; saved help requests and organiser replies; saved public enquiries; paginated organiser lists and CSV exports; admin editing of editions, registration settings, guest biographies, gallery media, programme and announcements; signed image uploads; audit entries; server-created payment orders, HMAC checks, captured-payment verification, duplicate protections and webhook handling.

The second edition supports Crisis Command. Cent$ible is retained only in the 2026 archive.

## What is implemented versus configured

The backend schema and Edge API have been deployed to `aptaodflhiopzjibyyzn`. The current project has no real user accounts or administrator assignment. Sign-up and recovery depend on correctly configured Supabase Auth redirect URLs and email delivery. Registration stays closed until dates, capacity, age rules, deadline, price and participation terms are supplied. Paid registration additionally requires Razorpay keys and a webhook secret. No real payment has been attempted. The original provider was Easebuzz; this new adapter is Razorpay and does not reuse or migrate the original merchant account. If Easebuzz must remain the provider, replace the adapter before payment launch.

This is source code and setup data, not an export of Supabase's managed Auth service, SMTP account, secrets or merchant credentials. Those must remain in their services. Existing public content is included as SQL seeds and local assets. No historical participants, payments or accounts have been imported from the old project.

## Deploy

Host `dist/` with a static host and deploy the API/database to Supabase. See `docs/SETUP.md`. The `.openai/hosting.json` file identifies the existing Sites project; it is not needed on an independent host.

## Downloadable laptop edition
Build a ZIP containing the full source and a direct-file browsing edition:

```sh
python scripts/package-laptop.py --output /path/to/output
```

Extract the resulting ZIP and open OPEN-WEBSITE.html. The separate live-connected launcher requires Python 3 and internet. The browsing edition disables backend submissions; web fonts still use the network, with local fallback fonts when offline.
