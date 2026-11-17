# Department application access — 17 November 2026

In /organisers, active OC members and department heads now have an OC applications section.

- HR (Human Resource) sees all OC applications across departments.
- Other departments see applicants whose first-choice department matches their current assignment. A second preference alone does not grant visibility.
- Existing operational aliases are mapped explicitly: Design & media → Design; Partnerships → Sponsorship; School outreach → Outreach; Operations & hospitality → Logistics; Programme & Crisis Command → Crisis Command.
- Members can search, filter by stage, read answers/work-sample URLs and save their own private feedback. Feedback is visible to its author and recruitment leadership, not other members or applicants.
- Leadership sees department feedback beside the existing scorecards. Interview, selection, status, email, deletion and access-assignment permissions are unchanged.
- Direct contact email/phone and internal leadership notes are not included in the department response. Other applicant-submitted answers remain visible.

Database: department_recruitment_visibility has already been applied to elan-v2. The SQL is included as scripts/department-recruitment.sql for migration history; do not rerun it on that project. No applicant data or accounts were deleted, changed or emailed.

Frontend: deploy this full package via the existing GitHub workflow. No direct GitHub deployment was available in this session.

Verification: local PostgreSQL tests cover member/lead/HR access, aliases, cross-department denial, anonymous and unassigned denial, revocation, contact redaction, feedback privacy and stale-write protection. DOM tests cover search, safe text rendering, feedback save/error retention and absence of status controls. All 80 existing unit tests passed; leadership/recruitment/team interaction tests and build/route/search checks passed. Live authenticated-role checks: Finance 3 applications, all Finance; Social Media 5, all Social Media. HR was tested locally; no current HR login assignment exists to test live.

Existing security advisory remains: leaked-password protection is disabled (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The two private mail tables intentionally deny direct access through RLS without policies. No new security advisory was reported.
