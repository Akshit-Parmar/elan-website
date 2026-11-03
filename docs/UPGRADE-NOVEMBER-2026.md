> Historical release notes. Gallery captions were subsequently removed. See GALLERY-WITHOUT-CAPTIONS.md and ORGANISER-TOOLS-NOVEMBER-2026.md for the current behaviour.

# Élan website upgrade · 2 November 2026

The approved homepage, its 3D scenes, logo, palette and core wording are retained.

## Included in this package

1. Mobile review: 47 routes checked at 320, 390, 768 and 1440 pixels. Fixed the narrow-screen header overflow. The sole remaining automated geometry flag was an intentionally enlarged portrait clipped by its frame; no page overflow remained. Reduced-motion support and existing motion controls are retained.
2. Gallery: category covers, empty groups ready for future uploads, selected cover photos, featured photos first, full-screen viewing, previous/next controls, arrow keys, Escape and touch swipe. Hidden category photos stay out of the active viewer sequence.
3. Photo library: search images and their known page placements; reuse an image in the page editor or guest/gallery form; set horizontal and vertical focus separately for each placement. Wide and narrow preview crops help choose the focus point. Full source images are retained. Gallery cover and featured controls are in Photo library → Adjust photo display → Gallery placement.
4. Admin overview: new enquiries, page drafts, unpublished entries, recent page publications and activity. Search all enquiries and filter by status/type, including second-edition interest. Update enquiry status directly from the overview. Large results are shown in pages of 20.
5. Next edition: clear cabinet-role explanations and an interest form, with consent and a saved reference number. Dates, venue, prices and eligibility remain unconfirmed. This form does not create a booking or send an automatic email.
6. Launch checks: backend receipt persistence, form failure/retry, photo reuse, crop/cover save controls, public gallery navigation, mobile navigation, upload retry tests, permission checks, local links and search files.

## Deploy

Upload the CONTENTS of Elan-GitHub-Deployment to the repository root. Keep the Cloudflare build command `python3 scripts/build.py` and output directory `dist`. Test its preview URL, then merge to the production branch when ready.

The additive photo-settings table is already installed in the existing Supabase project. No manual SQL or Edge Function redeployment is required for this update. `scripts/photo-settings.sql` records the additive change. Do not run `supabase/fresh-project.sql` on the existing project.

The on-device caption generator is retained. Photos are not sent to a caption API. The model's first download is still roughly 250 MB; review generated words before saving.

## Verification and boundaries

- Browser layout audit: 188 page/width combinations, plus gallery and admin fixture interaction checks.
- Photo metadata RLS verified in a rolled-back transaction: admin insert/update succeeds; non-admin write is denied; public read succeeds. No fixture settings remain in the live database.
- A synthetic second-edition enquiry was submitted through the live Edge API, its receipt and stored intent verified, then that one test enquiry removed.
- Browser fixture verified a failed interest submission retains typed values and a retry displays the saved receipt. Admin fixture verified enquiry status changes, focal/cover/featured settings and reuse of an existing photo into a new draft.
- Admin browser interactions used local fixture data. They did not impersonate the owner or publish gallery content. Owner sign-in, real event payments and confirmation emails were not newly tested; registration is closed and this release does not enable payments or email delivery.
- Supabase's security advisor reports the existing account setting “Leaked Password Protection Disabled”; no new database security warnings were introduced. Optional account hardening: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Gallery swipe is implemented; keyboard navigation and focus return were exercised in the browser. Physical-device touch feel still merits a quick check on the owner's phone after deployment.

## First use

Sign in to Admin → Overview. Open Photo library, search a photo, and choose Adjust photo display. Pick its gallery placement to set a group cover or feature it. For ordinary page replacements, open Edit website, click the image, then Use an existing photo; save a draft and publish when ready.

All changes here are packaged for GitHub/Cloudflare. The frontend has not been pushed to GitHub or deployed to elansummit.com by this delivery.
