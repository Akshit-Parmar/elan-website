# Winners & awards

Upload the contents of dist to your usual GitHub deployment location. The database addition has already been applied to the Élan project. Do not run fresh-project.sql on the live database.

Visitors: First edition → Winners & awards (`/winners-2026`).
Admin: People & teams → Winners & awards → Add a winner or team.

Add the exact award name, competition and winner's name. For a shared team entry, put the team name in the name field and list each member on a separate line. Alternatively create individual profiles for each member. School, introduction, reflection and photograph can be added later. A photo upload opens the existing crop tool.

Lower display-order numbers appear first within each competition. Save drafts until ready; confirm publication permission and check Show on the website to publish. Edit an entry to change its content, order or publication state, remove its photo or delete the entry. Deleting an entry retains the underlying photo file for other uses.

The public page groups entries into Crisis Command, Cent$ible and Other honours. No winners or quotations have been invented. Empty competition groups stay hidden.

Validation: 53 generated pages, local links, module imports and search metadata passed; 45 existing automated tests passed. Live database rollback tests verified public/draft visibility, nonadmin write denial, admin create/update/delete and permission-before-publish. Browser preview verified the public empty state and the editor's draft/edit/publish flow using a local in-memory test adapter, not live winner records. Real photo uploads reuse the existing crop/upload workflow; no new live photo was uploaded for testing.

An existing project-wide advisory remains: leaked-password protection is disabled. This feature did not change Auth settings. Guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
