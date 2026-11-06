# Editable gallery groups

Admin → Gallery → Manage gallery groups.

Create empty groups, rename groups, or remove groups. To remove a populated group, choose a destination: all its photos, including drafts, move together in one transaction. No image files or photo records are deleted. At least one group must remain. Duplicate names are rejected without regard to capitalisation. Group names appear in public gallery albums, filters, photo editors, and bulk upload/move options.

## Activate this release

This ZIP contains the full frontend and backend. Production backend changes were applied and verified on 6 November 2026 (elan-api version 10).

1. The gallery database update is already applied to the existing Élan project. Do not run it again.
2. The included `supabase/functions/elan-api` function is already deployed. It accepts registered custom groups; the database checks membership. Mandatory Instagram validation for OC applications is live and tested.
3. Upload this complete package to the GitHub repository using the existing Cloudflare build setup.

Do not run `supabase/fresh-project.sql` on the existing project. It is only for a new empty database.

Existing groups/photos are preserved. Existing standalone site image replacements are exempt from gallery membership and are not moved or removed. Old revisions referencing a removed group cannot be restored until that group is recreated. If live content cannot load, the public gallery retains its bundled fallback.

Validation: build, 45 existing Node tests and syntax checks pass. Rollback-only database checks cover creation, renaming, moving photos on removal, missing destinations, duplicate names, anonymous/nonadmin denial and public group reads. All 11 existing groups and 45 photo records were preserved. Test changes were rolled back.

Browser visual verification could not be completed because the preview connection was unavailable.
