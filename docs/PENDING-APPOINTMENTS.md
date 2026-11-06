# Direct OC appointments

Admin → People & teams → 2027 OC members lets an administrator save a private member before account creation. Choose department member, department lead, Director or Assistant Director under Workspace access. Leadership selection fills the title and department.

If the matching email already belongs to a verified account, access activates immediately. Otherwise the appointment remains pending until the person creates and verifies that email and signs in at /organisers. When workspace access is assigned, the form checks the saved email. A new account receives an Auth invitation to verify the email and choose a password, then enters /organisers. Existing accounts are not invited again. An existing unverified account must verify its email. The admin shows the send result and a Check / send invitation action for pending appointments. An expired invitation can be recovered using Reset password with the same email.

Director and Assistant Director must be distinct accounts. An occupied or reserved position cannot be overwritten by this form. Committee & access manages existing assignments; clearing a leadership position there also clears its pending reservation. Cancel pending access in the member editor leaves active access unchanged. Saving a record alone does not revoke existing permissions.

## Deployment

The pending_oc_appointments migration has been applied to the linked elan-v2 project. Upload the contents of dist to the existing website repository. scripts/pending-appointments.sql contains the migration for another installation. Do not run the fresh-project script against an existing database.

## Verification

Rollback database tests passed for unverified and wrong-email denial, administrator-only appointments, private pending records, verified activation, repeat claims, leadership reservation conflicts and distinct leadership accounts. Test fixtures were rolled back. Existing automated tests and build checks passed. No real person was appointed and no email was sent during validation.

## Invitation email setup

Invitations use the Supabase Auth email sender and Invite user template (the same Auth SMTP setup used for account emails), not the enquiry acknowledgement sender. Gmail acknowledgement credentials alone do not configure Auth SMTP. The Auth redirect allowlist must permit https://elansummit.com/portal/set-password.html?next=organisers (or the matching wildcard). Keep the Invite template link on {{ .ConfirmationURL }}.

The oc_invitations database update and elan-api function have been deployed to elan-v2. This update does not send invitations retroactively: edit a pending member and assign access, or choose Check / send invitation after uploading dist. New member saves with an assigned role request the invitation automatically. Saving a record only or cancelling pending access does not send one. A send failure does not remove the member. The sender request is limited to one per saved email every five minutes; existing accounts and previously invited accounts are not invited again.

Six invitation unit tests passed, including permission denial, existing-account skip, record-only skip, fixed destination, email taken from the saved record, provider errors and audit failure. The SQL lookup denied anonymous/nonadmin access. Email delivery and the provider redirect allowlist have not been tested with a real recipient; no test invitations were sent. Security advisors reported only the existing leaked-password-protection warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
