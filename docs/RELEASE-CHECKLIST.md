# Release checklist

Before deploying:
1. Keep the last tested ZIP and record the currently successful GitHub/Cloudflare deployment. The pre-change package from 19 November is retained separately as Elan-Baseline-2026-11-19.zip.
2. Run `npm ci --ignore-scripts`, then `npm run check` from this folder. The pinned test dependencies are development-only. This checks the build, links/imports, search metadata, unit tests, DOM flows and disposable PostgreSQL permission tests. It never sends real email or modifies Supabase.
3. Read the latest release note for database dependencies. Do not run every historical SQL file. This release requires member-welcome.sql, already applied to elan-v2.
4. Upload the full source package through the existing deployment workflow, excluding node_modules. Keep the deployment result and commit identifier.
5. Check the published homepage, OC application, organiser Start here and OC applications, plus admin email history. Confirm the new JS assets load and check the browser console.

Rollback:
- Redeploy the last successful frontend deployment or the retained baseline ZIP. Keep a copy of newer source changes before replacing files.
- This release adds a checklist table and read helper; older frontend code ignores them. Do not drop tables, restore an old database or rerun old schema scripts to roll back the website.
- Keep all application, feedback and account data intact. Do not resend uncertain emails as a rollback step.

The user's role-login and mobile review was reported complete before this release. Automated regression checks cover the changes; they do not replace post-deploy visual confirmation.
