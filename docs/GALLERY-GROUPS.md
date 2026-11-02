# Gallery groups

New groups: Opening Ceremony, Day 1 Committee Sessions, DJ Night, Day 2 Committee Sessions, Closing Ceremony and Felicitations. Existing groups remain.

Admin → Gallery → choose Gallery group → Add photo. The group is preselected. Upload, crop, add caption and image description, tick Show on the website and save. Empty groups remain available without creating placeholder image records.

The connected database category constraint and hosted elan-api function were updated on 2 November 2026. All six new category values passed transactional insertion checks, rolled back afterwards. Public empty-state filtering and admin preselection passed browser checks; the admin UI check used an isolated local fixture. No photos were added.

Deploy this ZIP’s frontend to see the controls on Cloudflare. No manual Supabase setup is needed on the connected project. scripts/gallery-groups.sql is provided for other existing environments.
