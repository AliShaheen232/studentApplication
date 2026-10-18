# Student profile and onboarding

## What was built
- After the first Google sign-in a student lands on `/onboarding`, a 4-step form. The dashboard stays locked until it is saved once.
- The same form opens from Profile > "Edit profile" for later changes.
- `GET /api/profile` returns the student's own profile plus `onboarding_complete`.
- `PUT /api/profile` validates and saves the whole profile. The first valid save sets `students.onboarding_completed_at`; later saves keep that date.
- `/api/auth/me` returns `onboarding_complete` (always true for admins).

## Why these fields
Every field feeds either program matching or the email composer. Nothing is collected "just in case".

| Step | Field | Required | Used for |
|---|---|---|---|
| About you | full_name | yes | email signature, sender name |
| | nationality | yes | eligibility, scholarships, tuition bands (EU vs non-EU) |
| | country_of_residence | yes | application fees, visa notes, timezone |
| | linkedin_url | no | link in email signature |
| Education | current_degree_level | yes | which target levels make sense |
| | field_of_study | yes | subject fit, email intro |
| | current_institution, graduation_year | no | email intro |
| | gpa, max_gpa (4, 5, 10, 20, 100) | yes | minimum-grade checks, normalised to a percentage |
| Your goals | target_level (Bachelor, Master, PhD, MBA) | yes | level filter in the matcher |
| | subjects (1-5, from the subject list) | yes | subject fit |
| | countries (1-10, from the destination list) | yes | country filter |
| | intake_term (next 10 terms) | yes | deadline check |
| | budget_max + currency | yes | tuition filter (0 = free or funded only) |
| | funding (self, partial, full_scholarship) | no | scholarship emails and ranking |
| Languages & experience | english_test + matching score | yes | language requirement check |
| | german_level (A1-C2, native) | no | German-taught programs |
| | work_experience_years | no | MBA and professional master entry rules |
| | research_interests | no | the personal opening line to professors and labs |
| | experience, academic_achievements | no | email body |
| | preferred_universities, additional_preferences | no | ranking boost, notes |

`qualification` is filled automatically as "<degree level> in <field of study>" so older screens and the matcher keep working.

## Validation (server, `worker/lib/profile.ts`)
- Required fields above; per-field messages returned as `{ fields: { name: message } }` with HTTP 400. The form jumps to the first step with an error.
- GPA between 0 and the chosen scale. English score range per test: IELTS 0-9 in 0.5 steps, TOEFL 0-120, PTE 10-90, Duolingo 10-160. Scores for other tests are dropped.
- Subjects must come from `FIELDS_OF_STUDY`, countries from `DESTINATION_COUNTRIES` (`core/destinations.ts`, 58 popular destinations: all of Europe plus Russia, Turkey, China, Malaysia, Singapore, Australia, Canada, USA, South Korea, South Africa, Japan, UAE, Pakistan). Max 10 (`MAX_DESTINATIONS`).
- Intake must be `Spring|Summer|Fall|Winter YYYY` within the next 4 years. LinkedIn must be an https link. Text is trimmed and length-capped.

## Files
`worker/lib/profile.ts`, `worker/routes/profile.ts`, `migrations/0005_google_signin_profile.sql`, `src/components/OnboardingView.tsx`, `src/components/StudentProfile.tsx`, `src/App.tsx`.

## Privacy
- Only the student can read or change their own profile. Admins have no student profile and get 403 on save.
- New Google accounts start with empty fields; the old fake defaults (GPA 3.8, "Fall 2026", etc.) are no longer written.

## Tests
`tests/worker/signup.test.ts`: validation rules, onboarding flag, edits keep the completion date, CSRF and session required, isolation between students, admins blocked.

## Known limits
- The matcher route is not ported to the Worker yet, so matches do not use the new fields until stage 4.
- Nationality list comes from the browser's country names; the server stores the text as given (max 80 chars).

## Unverified
- Not yet clicked through in a browser against the live D1.
