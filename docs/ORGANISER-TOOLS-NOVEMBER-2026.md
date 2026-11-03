# Organiser tools and visitor journeys · 3 November 2026

This release keeps the approved navy, cream and burgundy homepage, logo, 3D entrance and navigation. Gallery captions remain removed. This is a complete source/build/backend package for the existing GitHub and Cloudflare setup.

## 1. Gallery management

Admin → Gallery now has selection boxes, Select visible, Clear selection, Publish selected, Hide selected and Move to group. Select up to 200 photos, including across filters. The selection count includes hidden selections. Bulk operations are atomic: an invalid selection fails without partially updating photos. Save pending drag order first.

Bulk upload accepts up to 20 photos, shows preparation/upload/save progress and a batch progress bar, supports skipping a photo, and retries only unsaved items. New uploads remain drafts. Use selection to publish a batch together.

New uploads record a SHA-256 fingerprint of the prepared image. Matching stored bytes or a matching filename prompt before another copy is saved. Filename matches are only a warning, not proof. Older uploads have no fingerprint until replaced; resized/cropped/re-encoded versions can differ, so this is not visual similarity detection. SHA-256 requires HTTPS. If fingerprint recording fails after a successful photo save, the photo remains saved and the UI says so. No caption model or third-party image service is involved.

## 2. First-edition photo story

The opening, Day 1 sessions, DJ night, Day 2 sessions, closing and felicitations retain separate short introductions. Individual photo captions have been removed from the story and viewer. Descriptions remain as alt text for accessibility.

Publishing photos into the corresponding gallery group automatically adds up to three featured/ordered images below that story chapter. Each strip links to its filtered gallery. Empty groups leave the existing event images in place, without invented photos or empty blocks. Uploaded galleries remain entirely under your control.

## 3. Enquiry paths

The next-edition page has separate routes for students, schools, volunteers and partners/sponsors. Each opens a short, preselected enquiry form with relevant guidance. Schools and volunteers are saved with the appropriate enquiry kind. The standalone school, volunteer and contact forms are shorter too. Confirmation displays the stored reference; an enquiry does not book a ticket or send a confirmation email.

## 4. Organiser inbox

Admin → Organiser inbox provides search, status, assignment and follow-up filters. Open Manage enquiry to assign an existing organiser, set a follow-up date and save private notes. Status is saved separately. Private notes and organiser assignments are accessible only to administrators, even when the assigned person has another staff role. This does not grant new access or email anyone.

Another organiser's newer notes cannot be overwritten silently. If a version conflict appears, reopen the enquiry before retrying. Follow-up dates are a work list, not automated reminders.

## 5. Content history

Admin → Content history previews and restores gallery/placement records, guests, stories/film and photo display settings. The baseline is the content present when this upgrade was installed; earlier versions cannot be reconstructed. New saves create snapshots automatically. Restoring an entire entry also restores its publication status, and is itself recorded as a new version. Concurrent updates are rejected. Deleted records cannot be recreated by this interface. Page text drafts and history remain in Edit website.

## 6. Visitor measurement

Public pages have a footer control called Visitor measurement. It is OFF by default, honors Do Not Track and Global Privacy Control, and counts only visitors who explicitly opt in. Admin → Visitor measurement shows 7/30/90-day totals for page views, 30 seconds of visible engagement, exits and enquiry forms started/saved.

Only a whitelisted page name and event type are recorded in daily aggregate counters, using Indian dates. The application does not store names, form contents, visitor identifiers, full URLs, referrers or individual browsing trails in this measurement table. The visitor's choice is stored in their browser. Infrastructure providers may retain their ordinary access logs separately.

These are event counts, not unique people, an exhaustive traffic report or a person-level funnel. Refreshes count again, and browser closure/blocking can lose events. Exit events do not establish why a person left. Account/admin pages, embedded previews and the local development host are excluded. The endpoint accepts anonymous aggregate events, so totals are directional and not suitable for billing or anti-fraud decisions.

## Deployment

The additive migration scripts/organiser-upgrade.sql has already been applied to the existing Élan project aptaodflhiopzjibyyzn. No new API key, Edge Function deployment or manual database step is needed there. The existing API is unchanged. Do not run supabase/fresh-project.sql on the live database; it is only for a new empty project.

Extract the ZIP and upload the contents of Elan-GitHub-Deployment to the repository root, replacing matching files. Keep Cloudflare: framework None, build command python3 scripts/build.py, output dist. Test a branch preview before merging. This delivery does not push or deploy the frontend.

## Verification

- 29 Node checks, Python content-inventory test, all local links and original route/asset/legal parity checks pass.
- Search checks pass: 25 canonical public URLs, account pages excluded, original Google verification file retained.
- Live database rollback test verified admin bulk move/restore and workflow save; stale writes rejected; non-admin reads and writes denied; anonymous metric inputs limited to public pages. No synthetic test records remain.
- Browser fixture verified selection/publish, organiser assignment/date/notes, content preview and visitor totals. These use synthetic data and do not impersonate the owner's login.
- Real public pages checked at 320, 390, 768 and 1440 pixels: homepage, next edition, schools, volunteers, contact, first edition and gallery. No horizontal overflow in these 28 checks. School enquiry preselection verified.
- Existing Supabase advisor warning remains: Leaked Password Protection Disabled. No new database security warnings. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Owner login, real photo uploads through that account and deployment-domain visitor consent still need the owner's normal post-deployment check. Payments, email delivery and registration opening were not changed or claimed tested.
