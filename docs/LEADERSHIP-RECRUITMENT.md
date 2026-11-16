# Director and Assistant Director recruitment access

Both assigned leadership seats now have **OC applications** in the organiser workspace at /organisers. They do not need admin accounts.

They can read OC applications, use the attention queues, change stages (received, under review, shortlisted, interview, waiting list, not selected), schedule/publish/reschedule interviews, provide the meeting link or location in applicant instructions, see confirmations/rescheduling requests, record private interview feedback, prepare onboarding briefs, view email status, retry definitively failed emails and resend applicant setup links. The existing mail worker sends applicant-facing updates.

Interview feedback and onboarding records are shared with the administrator and both leadership seats. Private notes are not sent to applicants. Review history records the account that changed a stage. Concurrent review saves are version checked; reload if another reviewer saved first.

Final selection and account/department permission assignment remain admin-only. Leaders record a Proceed recommendation for the administrator to appoint. Leaders cannot delete applications, change selected appointments, access general enquiries or use the rest of Admin. Department heads and members do not get recruitment access. No applicant withdrawal feature is included.

Interviews use the meeting link/location you supply; there is no built-in video calling service.

## Activate

1. Apply the previous applicant portal, email automation, status fix and recruitment-readiness upgrades if not already installed.
2. Run scripts/leadership-recruitment.sql once in the existing Supabase SQL Editor, LAST. Do not subsequently re-run the earlier status-fix function replacement because it would restore the old admin-only check.
3. Redeploy elan-api including shared modules, and deploy the website files through GitHub/Cloudflare. Keep the applicant email worker scheduled.
4. Verify that the Director and Assistant Director accounts have their actual approval-seat assignments in Admin → Committee & access. Typing a job title into a profile does not grant access.
5. Test both accounts: OC applications opens; Under review saves without an interview time; interview invitations and feedback work; general enquiries and admin controls are unavailable. Confirm a normal member has no recruitment tab.

Local checks passed for both leadership seats, non-applicant enquiry exclusion, feedback access, member denial, revoked leadership denial and final-selection restrictions. DOM interaction checks passed for both leadership and admin views. Live deployment, inbox delivery and visual browser checks remain to be confirmed after upload.
