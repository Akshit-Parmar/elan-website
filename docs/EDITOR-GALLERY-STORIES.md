# Gallery, drafts, stories and film — 2 November 2026

## Gallery

Select a gallery group, then choose up to 20 JPEG, PNG or WebP files (8 MB per source file). Add captions and image descriptions, then Upload as drafts. Images are resized to a maximum dimension of 1800 pixels and converted to WebP. Each item has a stable identifier; retrying a partial failure skips successful items. Closing a failed batch leaves completed drafts in Gallery. Open each photo to review and publish it.

Drag photo cards, or use Move earlier / Move later for keyboard and touch access. Save photo order publishes the order atomically. Save ordering before editing individual items. Ordering covers the whole collection; filtering only changes the visible subset.

## Page editor

Save draft stores page text and photo replacements privately in Supabase without changing the public page. Saved drafts reopen when returning to the page, including on another signed-in device. Toggle Preview mode to inspect the page without editing. Publish applies the draft's text and image changes in one database transaction, records previous values and clears the saved draft. Concurrent draft edits are rejected with a reload message rather than silently overwritten.

History shows the latest 30 publications made through this new workflow. Loading a history entry restores the values changed by that publication into a draft; it does not immediately publish them or rewind unrelated content. Preview, then publish. Discard draft clears the saved draft and unsaved edits; the published page remains unchanged. Uploaded assets can remain in storage after a draft is discarded; there is no automatic asset deletion.

History begins with this update. It covers page text and photo placements, not guest, gallery or story collection edits. It does not reconstruct changes made before this version or by older admin clients. Close older admin tabs before using the new workflow.

## Stories & film

A new admin tab manages testimonials, participant stories and highlight-film entries. Fields include title, name, role/school, text, optional portrait/poster, display order, permission confirmation and publication. These appear on the First edition page using shared templates. Empty or unpublished sections stay hidden. No real testimonials or film were supplied or invented.

Films use a YouTube or Vimeo video link, normalized to an allowed host and video identifier. The external player is created only after Play is pressed. Add captions at the video host. This release does not upload or edit raw video files. Supply an approved final video link when ready.

## Backend and deployment

The connected project already has the new tables, policies and functions. No manual database reset or migration is needed for the supplied frontend deployment. Incremental setup is in scripts/editor-workflow.sql; the empty-project script includes it. Do not run fresh-project.sql against the existing database.

Private privileged operations live in a non-exposed schema, check the caller's admin role and are reached through invoker wrappers. Anonymous users cannot invoke them. The public story reader sees only approved, published rows.

## Verification and limits

- Transactional hosted tests: draft privacy, stale draft rejection, publication, previous-value restore, all-or-nothing rollback on an invalid photo, approval requirement, gallery order persistence, non-admin and anonymous denial. Test data rolled back.
- Browser with local simulated persistence: draft save/reopen across pages, preview, publish/history restore, bulk review, partial upload failure and retry without duplicates, actual drag-to-reorder, keyboard reordering, story approval errors and draft save. Film preview did not create an iframe before Play.
- 12 Node tests passed, including allowed film URL handling. Original page/asset/legal checks and search metadata checks passed.
- Security advisor: no new schema/function warnings after restricting the private operations; the pre-existing leaked-password-protection setting remains disabled.
- Actual signed-in admin upload and publication still need an owner check on the deployed site. Browser fixtures do not replace that end-to-end check. No user content was published and no privileged test account was created.
