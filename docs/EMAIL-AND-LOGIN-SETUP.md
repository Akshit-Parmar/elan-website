# Email and account update · 5 November 2026

This release adds inline progress/success/error feedback to account forms, a sign-in handoff after email verification, and a Gmail SMTP option for acknowledgement emails. The live elan-api function was updated to version 7. The website files still need uploading to GitHub/Cloudflare. No database migration is needed for this update if the previous application-journey release is installed.

## 1. Authorise Gmail privately

Sign in to the.elan.summit@gmail.com in your own browser. Enable Google 2-Step Verification, then create a Google App Password for Élan. Use the app password, not your normal Google password. If Google does not offer App Passwords for this account, stop: this SMTP approach cannot be enabled as written. Never paste the password into chat, GitHub, public-config.json or a webpage field served by Élan.

## 2. Account confirmation and password-reset emails

In Supabase project elan-v2 (aptaodflhiopzjibyyzn), open Authentication → Email → SMTP settings (the dashboard may group this under Email/SMTP). Enable custom SMTP:

| Setting | Value |
| --- | --- |
| Sender email | the.elan.summit@gmail.com |
| Sender name | Élan Summit |
| Host | smtp.gmail.com |
| Port | 465 |
| Username | the.elan.summit@gmail.com |
| Password | Your Google app password |

Keep Confirm email enabled. Keep the {{ .ConfirmationURL }} link in confirmation and recovery templates. You can change the template titles/branding to Élan Summit; Supabase still performs verification behind the scenes.

In Authentication → URL Configuration set Site URL to https://elansummit.com. Allow your production confirmation/recovery destinations, including https://elansummit.com/** so application-status.html, portal/index.html, organisers and portal/set-password.html with next parameters are permitted. Do not add broad unrelated domains. This frontend uses PKCE: open the link in the same browser that requested it. A different browser/email-app embedded browser may not have the code verifier; request a new link in the browser you want to use.

## 3. Application and enquiry acknowledgements

In the same project's Edge Functions → Secrets add:

Name: GMAIL_APP_PASSWORD
Value: the Google app password for the.elan.summit@gmail.com

The backend now prefers Gmail when this secret exists. It uses implicit TLS on port 465 and a fixed Élan sender/reply address. No frontend secret or rebuild is needed after adding it. The previous Resend option remains a fallback only when the Gmail secret is absent; it needs a verified domain sender, not a Gmail From address.

The acknowledgement secret does NOT configure Auth SMTP. Complete both steps above. An SMTP error does not lose an application. Admin → OC applications shows the saved email status and retry where safe. No previous applicants were emailed by this update. A sent status means the SMTP server accepted the recipient, not guaranteed inbox delivery. Ambiguous timeouts remain sending for manual reconciliation rather than risking duplicate messages.

## Account behaviour

- New applicants submit without signing in, then create a verified account with the same email to see their application.
- On signup, the page immediately shows progress and then inbox instructions or the actual error.
- If Auth returns a valid session, the account opens immediately. Otherwise confirmation is required first; opening the verification link in the same browser establishes the session and opens the intended page. The original login tab also listens for the verified sign-in event.
- Already signed-in people do not have to sign in again when they visit the login page.
- Password resets return to the intended application/admin/organiser/participant destination after saving the new password.
- Existing persistent session behaviour is unchanged. Tabs and windows share the login. Closing a window does NOT automatically sign out in this release. A web page cannot reliably identify all tabs belonging to one browser window or distinguish window close from tab close, navigation, crash or mobile suspension. sessionStorage is per tab; session cookies are shared across windows and may be restored. No false window-only guarantee is implemented. Use Sign out until an alternative session policy is agreed.

## Verification and remaining setup

40 Node tests pass, including safe destination mapping, verified sign-in event handling, SMTP recipient acceptance, explicit rejection and uncertain delivery handling. Build, route/import and search checks pass. Browser inspection confirmed the login page and a local simulated form's progress and result feedback. No real account was created and no email was sent in testing. The live API remains healthy but reports emailConfigured=false until secrets are set. Auth SMTP and Gmail delivery must be tested after owner configuration with an address you control.

## Provider documentation

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://support.google.com/mail/answer/185833?hl=en
- https://developers.google.com/workspace/gmail/imap/imap-smtp
