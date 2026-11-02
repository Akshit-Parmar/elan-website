# Six improvements — 2 November 2026

This release preserves the approved homepage doors, logo, palette, first-edition navigation and original legal content. It does not deploy itself.

1. Layout and mobile: audited 25 public pages at 375, 768 and 1440 pixels; no page-level horizontal overflow. Corrected the founder portrait transform on narrow screens. The first-edition chapter bar intentionally scrolls horizontally. Added clearer keyboard focus, mobile form sizing and anchor offsets.
2. Visitor journey: rebuilt the next-edition information page with confirmed versus unannounced details, distinct student/school, volunteer and partner enquiry routes, and a compact archive link. No next-edition prices or dates are invented.
3. Content and photos: more varied images on the enquiry pages and clearer Crisis Command judging descriptions. Existing biographies remain intact. Photos retain their original files and accurate descriptions.
4. Admin: photo uploads now offer original, landscape, portrait or square crops, zoom and positioning. The uploaded copy is WebP and at most 1800 pixels. Website text saves compare returned database values; image and collection saves require a matching server record before reporting success. Existing placement-specific replacements, restore controls and guest/gallery templates remain.
5. Performance and access: responsive variants for 20 bundled photos, actual image dimensions, asynchronous decoding, reduced-motion styles and conditional loading of the archive story script. Prepared responsive images are included, so a normal build needs no new Python dependency. Pillow is optional when regenerating variants for new source photographs.
6. Forms and backend: duplicate-submit guard, busy state, accessible result focus and preserved form values on error. Contact, school and volunteer enquiries were each submitted to the existing API, confirmed in Supabase, then removed as test data. Anonymous dashboard/admin requests returned 401. Content-policy tests passed in a rolled-back transaction: admin writes, non-admin denial, draft privacy and published reads.

## Verification

- 47 generated pages; all 37 original routes preserved; local links/assets resolve.
- Original favicons and original image assets unchanged byte for byte. Legal main content unchanged except the previously approved email replacement.
- 25 canonical public URLs; descriptions, JSON-LD, social metadata and Search Console file verified. Private account pages excluded from search.
- Eleven Node tests and one Python inventory regression test passed. Changed JavaScript passed syntax checks.
- Browser photo-crop fixture produced a 1280 × 1600 WebP for portrait selection; cancelling returned without upload. Fixture removed before packaging.
- Browser layout sweep covered 75 page/viewport combinations. This is not a claim of exhaustive accessibility or real-device testing.

## Remaining owner checks

Authenticated administrator login, a real storage upload and an actual admin content edit still need a signed-in check on the deployed preview. No privileged test account was created. Email delivery and payment checkout were not tested. The hosted API reports payments unconfigured; both edition registration settings remain closed. Do not announce payment availability until configured and tested.

Upload the folder contents to a test branch and use Cloudflare's preview deployment first. No Supabase migration, reseeding, new project or function redeployment is required for these frontend changes. Existing database content overrides still take precedence over bundled copy.
