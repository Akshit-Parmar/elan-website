# People and application controls

This update adds three administrator tools. It does not delete or create any real person automatically. The backend update and the scoped database migration have been applied to the existing elan-v2 project. Upload the complete deployment package to GitHub so Cloudflare serves the new admin screens.

## Delete a website account

Admin → People & teams → Website accounts. Search by name or email, choose Review deletion, and type the displayed email to confirm permanent deletion.

Deletion removes the Auth login and its profile and organiser access. It does not delete the independent OC application, public 2026 profile or private 2027 member record. These are separate records with separate controls. Deleting an application alone does not revoke organiser access.

Your own account and staff accounts are protected. Accounts linked to registrations, support tickets, submissions, tasks, approvals, financial/department records, audit history or owned uploads are blocked from deletion and the screen lists the linked records. This release deliberately does not erase those records or uploaded files to force an account deletion. Such accounts need a separate reviewed retention/anonymisation process if full removal is necessary. Revoke organiser permissions in Committee & access when the immediate goal is to remove workspace access.

The server checks administrator permission, target ID, linked records and typed email, and logs the request before calling the server-only Auth deletion API. Successful Auth deletion removes refresh sessions; already-issued JWTs remain cryptographically valid until expiry. The existing site's permissions and sensitive RPC authorisation remain unchanged, and this release does not promise immediate revocation of every old JWT. No new site-wide RLS rules or Auth deletion triggers are installed.

## Delete an OC application

Admin → Workspace → OC applications → Review application → Remove this application. Type the applicant's email and confirm. The application, review history, interview details, enquiry workflow and acknowledgement record are deleted together in one transaction. The applicant tracker will no longer return it. A reference-only audit entry remains. Sent emails cannot be recalled.

Deletion is rejected if another reviewer changed the application since it was opened, or if an acknowledgement is still in an uncertain/sending state. Refresh a stale application; reconcile email delivery before deleting a sending application. The person's account and granted permissions remain intact.

## Add a directly appointed 2027 OC member

Admin → People & teams → 2027 OC members → Add OC member.

Enter name, email, department and committee role. Phone and private notes are optional. Choose Save record only to save directly in the database with no application or existing login required. This list is private; it is not a public 2027 directory.

To also grant workspace access, the person must first create and verify an account with the same email. Choose Grant member access or Grant department lead access, then save. This atomically saves the member and department access; a failed access grant does not leave a partial new member. They use /organisers and their own password. You never need to choose or know their password. Director and Assistant Director approval seats remain separate in Committee & access.

Save record only leaves any existing access assignment unchanged, even if you edit their department or email. Choose the appropriate access action to update an assignment. Changing an email does not silently revoke a different account's permissions; manage the old assignment in Committee & access if necessary. Existing organiser assignments are still shown there; this register is for direct appointments and does not fabricate a roster from those assignments.

For a public 2026 member with photo and biography, use Admin → People & teams → 2026 OC members → Add member. Existing edit, reorder and remove controls are retained.

## Deployment and validation

No real user account or OC application was deleted. The SQL security rehearsal used synthetic records in a transaction that was rolled back. It checked admin-only account listing, protected linked tasks, member-register privacy, no implicit permission grants, explicit verified grants, rollback of failed grants, stale updates/deletes, email confirmation matching, rejection of generic enquiries and cleanup of application child records while preserving login/access.

45 Node tests passed, including server account-delete authorisation, self-delete rejection, preflight/audit failure handling and target identity. The Auth hard-delete API itself was mocked in tests; no real Auth account was deleted during this release. Browser checks used local fixtures to verify typed confirmation, cancellation availability, simulated deletion and direct member saving. Route, module and search checks passed. Public pages and images were not redesigned. The existing security advisor warning about disabled leaked-password protection remains: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

The initial broad access-policy migration was rejected by automatic review; it was not applied. It was replaced with this narrower migration, which changes only the requested admin data/functions and adds the private member table. No approval is outstanding for the delivered update.
