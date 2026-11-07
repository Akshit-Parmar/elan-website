# Élan 2027 applicant and organiser email setup

Deploy the contents of dist to the website repository. The database update and elan-api version 12 have already been installed on the linked Élan project.

1. In Supabase Authentication → URL Configuration set Site URL to https://elansummit.com and retain existing valid URLs. Add all three exact destinations:
   - https://elansummit.com/portal/set-password.html?next=organisers
   - https://elansummit.com/portal/set-password.html?next=application
   - https://elansummit.com/application-status.html
2. In Authentication → Email Templates paste the full HTML body from the corresponding supabase/templates file and save the subject:
   - Invite user: oc-invitation.html — “Your Élan Summit 2027 account invitation”
   - Reset password: oc-recovery.html — “Your fresh Élan Summit password link”
   - Magic link: oc-magic-link.html — “Your Élan Summit sign-in link”
   - Confirm signup: confirm-signup.html — “Confirm your Élan Summit account”
   Keep the ConfirmationURL expression intact. For other enabled Auth notifications, reuse the signature table without replacing the notification's own link. Dashboard templates are not installed by uploading dist.
3. New OC applicants receive an Auth setup email after the application is saved. Existing accounts get a receipt without a password change; when the separate enquiry sender is unavailable, Auth sends the applicant sign-in email. Failures leave the application saved. The admin can retry sending. There is no automatic bulk resend to previous applicants.
4. Applicants use /application-status, with their own profile, interview replies and timeline. One verified email can also hold a participant profile, but no ticket or participant signup is needed. Selection in the updated admin requires an approved department and grants member access, or reserves it pending verification. Applicant requests for leadership positions never set permissions. Review pre-existing selected records individually. A later change to an application decision does not revoke an existing appointment; use Committee & access to revoke it.
5. Broken setup link: use Send fresh applicant setup email in OC applications or Send fresh setup email in 2027 OC members on a pending/active assignment. Use only the latest email. No application, account or appointment needs deleting.
6. Participant accounts can visit /portal/profile.html before purchasing tickets. Profile fields are name, verified email (read-only), phone, school or college, grade or study year, and city.
7. Test with a fresh address you control after deployment: submit the OC form → open email → set password → applicant portal; select and assign a department → /organisers. Check a resend using an existing account as well. No email was sent to real people during testing.
