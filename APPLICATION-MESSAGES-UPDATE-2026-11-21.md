# Applicant messages and notification identity

The Supabase migration scripts/application-messages-update.sql has already been applied to the live elan-v2 project on 21 November 2026. Do not rerun older database setup scripts.

Deploy the complete dist folder through the existing GitHub deployment to update the reviewer preview and applicant display. Source and native bundles are included.

Every recruitment stage has an automatic message. Reviewers can leave Personal message blank; the database supplies the stage text. Choosing a different stage clears the previous personal message in the editor so it is not accidentally reused. A new personal message overrides the default. Existing saved personal messages are preserved until edited or the stage changes.

New recruitment notifications identify the applicant, describe the change and name the signed-in actor and leadership role where available. Background changes are labelled Élan system. The application reference distinguishes applicants with matching names. Department recipient permissions remain unchanged; private notes and contact information are not added to notifications. Existing sent emails are not rewritten or resent.

No applicant data was edited and no test emails were sent during this update.
