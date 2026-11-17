# Experience and HR update — 17 November 2026

This package preserves the preceding recruitment fixes and all prior packaged files.

- HR (Human Resource) is available as either application preference, with a practical team-coordination question. Mandatory Instagram and study year are unchanged.
- HR is registered in the live elan-v2 department modules with existing general department tools (tasks, briefings, submissions and handoffs). It does not inherit Director/Assistant Director recruitment privileges.
- Home has visible event, OC and partnership routes, a three-step Crisis Command explanation, an explicitly illustrative scenario and links to first-edition photographs and winners. No invented testimonials or unconfirmed event dates were added.
- Application introduction explains responsibilities, remote work, commitments, review and tracking. Unsaved answers trigger a browser departure warning; successful submission clears that warning. Answers are not stored on shared devices.
- Organiser overview sorts unfinished work by deadline, adds leadership applications/interviews access and shows saving feedback. Failed saves retain the form.
- Mobile menu containment checks follow the navigation into its dialog. Existing compact-home static fallback is retained. New sections collapse to one column; touch controls and reduced-motion treatment are included.
- FAQ directs OC applicants to the application rather than the generic volunteer enquiry.

Validation: 80 unit tests, application DOM test, recruitment dashboard/team/leadership/readiness interaction tests including rejected RPC health requests; build and route/search verification passed. 55 pages, 37 original routes, 31 canonical public URLs. No applicant withdrawal added. Existing legal bodies and original images retained.

Deployment: upload this full package to the existing GitHub deployment workflow. The HR department insertion has already been applied to elan-v2; scripts/hr-department.sql is safe to rerun. Frontend changes are not live until deployed. Browser preview was unavailable in this environment; actual mobile/desktop visual QA remains outstanding.
