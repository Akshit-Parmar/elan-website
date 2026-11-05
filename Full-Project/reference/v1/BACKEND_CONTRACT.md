# Élan 2026 — Backend Contract Freeze

This is the immutable data contract the redesign is built around. **Nothing below was
changed.** The visual transformation only re-authors CSS and adds progressive-enhancement
JS. No SQL, no schema, no env vars, no routes, no payloads, no handlers were modified.

## Supabase (unchanged)
- URL: `https://aohgapmexswwzvcxknbg.supabase.co` (in `public/assets/js/config.js`)
- Anon key: unchanged, browser-safe, RLS-protected.
- Client created via `sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` — unchanged.
- Config global: `window.ELAN_CONFIG` — unchanged.

## Public forms  (`form[data-form="…"]` → Supabase table, via `FORM_BUILDERS` in main.js)

### registration → table `registrations`
| payload key   | source id / logic                                              |
|---------------|----------------------------------------------------------------|
| full_name     | `#fullName`                                                    |
| email         | `#email`                                                       |
| phone         | `#phone`                                                       |
| school        | `#school`                                                      |
| ticket_type   | `#ticketType` (option value = visible label, e.g. `Early Bird · ₹3,699`) |
| quantity      | `#quantity` (int, default 1)                                   |
| unit_amount   | parsed ₹ from ticket_type                                      |
| amount        | unit_amount × quantity                                         |
| notes         | `[Flagship: …]` tag from `#flagshipChoice`/`#centsibleTheme` + `#notes` |
| consent       | `#consent` (checkbox boolean)                                  |
- Honeypot: `input[name="elan_hp"]` — silently drops bots.
- Availability windows (`TICKET_WINDOWS`, IST) gate `.price-card[data-tier]` buttons and
  `#ticketType option[data-tier]`. Tiers: `early`, `standard`, `late`, `school`.
- On success: row saved (pending), redirect to Easebuzz form
  `https://forms.easebuzz.in/register/SANJAYGHODAWATINTERNATI/Elan_Registration_Form_SGIS_2026-27`.
  Row confirmed `paid` only by the server-side `easebuzz-webhook`. **Form is NOT reset.**

### contact → table `contact_messages`
full_name `#contactName`, email `#contactEmail`, phone `#contactPhone`,
inquiry_type `#inquiryType`, message `#message`.

### school → table `school_inquiries`
school_name `#schoolName`, coordinator_name `#coordinatorName`,
coordinator_email `#coordinatorEmail`, coordinator_phone `#coordinatorPhone`,
estimated_students `#estimatedStudents` (int), interest `#interest`, notes `#schoolNotes`.

### volunteer → table `volunteer_applications`
full_name `#volName`, email `#volEmail`, phone `#volPhone`, school `#volSchool`,
role `#volRole`, commitment `#commitment`, motivation `#whyVolunteer`.

## Auth & portal  (auth.js / portal.js — unchanged)
- Supabase Auth email + password. `signInWithPassword`, `resetPasswordForEmail`,
  `updateUser`, `getSession`, `signOut` — all unchanged.
- Portal guard reads table `participants` by `.eq("auth_user_id", session.user.id)`;
  unlocks only when `payment_status ∈ {paid, confirmed}`.
- Profile update writes `phone, school, emergency_contact, dietary_preference`
  to `participants` by `id`.
- Portal reads: `portal_announcements` (is_published), `portal_schedule_items` (is_published).
- Redirects unchanged: login→`dashboard.html`, logout→`../index.html`, guard→`login.html`.

## Admin (admin.html — unchanged)
- Self-contained; posts to Edge Function `admin-issue-batch` with an admin secret.
  `noindex,nofollow`. Not touched.

## DOM hooks the shared JS depends on (all preserved by the redesign)
`.site-nav .scrolled`, `.menu-toggle .open`, `.nav-panel .open`, `.nav-link/.nav-cta`,
countdown `#days/#hours/#minutes/#seconds` + `#navDays/#navHours/#navMinutes/#navSeconds`,
`.reveal → .visible`, `.faq-question/.faq-item/.open`, `#faqSearch`,
`[data-filter]/[data-category]/.schedule-day-heading/.schedule-card/.active`,
`[data-plan]/.btn-teal`, `.toast → .show`, `.field/label/.field-error/.has-error`,
`.price-card[data-tier]/.btn[data-ticket]/#ticketType/#registration/#regClosedNote/.is-disabled`,
`form[data-form]/.form-success → .show/button[type=submit]`, `#centsibleThemeField`,
portal `#ep-main/[data-page]/.ep-*`. The CSS restyles these; it never renames them.
