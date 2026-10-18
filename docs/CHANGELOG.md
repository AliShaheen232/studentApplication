# Changelog - AdmitPath

All notable changes to the AdmitPath application will be documented in this file.

## [1.12.0] - 2026-10-19

### Backup for failed live checks, honest programme details

- Live checks whose pages failed in the Worker (for example over the CPU limit) and found nothing are queued as `backup`; the hourly GitHub run (`crawler/run.ts`, `crawler/backup.ts`) crawls up to 10 of them with no CPU limit and saves the programmes. Discover shows "Queued for a deeper check".
- Programme details no longer show invented text: unknown deadline, requirements, language and department show "Not listed", and the last check date is real.

## [1.11.1] - 2026-10-18

### Refresh every 100 days

- Saved live results, the search cache and the bulk crawler's per-university refresh now last 100 days instead of 30 (`LIVE_FRESH_DAYS`, `CACHE_DAYS`, `REFRESH_DAYS`).

## [1.11.0] - 2026-10-18

### Live discovery by university

- The GitHub bulk crawler now stores only which subjects and levels each university teaches (`university_subjects`, migration 0011), about 10 writes per university instead of about 200.
- Discover lists 15 universities per page and crawls their programmes live from the browser, one page per Worker request (robots.txt, 1.5 s per host, 8 pages per university, own domain only). Results are saved for 30 days and the next pages are checked in the background.
- Caps: 400 universities a day overall (`LIVE_CRAWLS_PER_DAY`), 60 per student. Live writes count toward the crawler's daily D1 budget.
- Page extraction is about 3 times faster (one pass per page, combined field regex).
- Programme details show "Not listed" for unknown duration.

## [1.10.0] - 2026-10-18

### Discover reads only matching rows

- Discover now needs country, field of study and study level; budget and keyword are optional.
- New `program_search` table (migration 0010): primary key `(country_code, subject, level, rank_sort, program_id)`, WITHOUT ROWID. A search reads about 50 rows instead of every programme in the country.
- 50 results per page with "Load 50 more"; budget keeps programmes with no listed fee ("Fee not listed").
- Repeated searches served from the Workers Cache for 30 minutes.
- Coverage counters stored on `crawl_countries`; the crawler queue uses a partial index, so neither scans whole tables.
- Old `subject` and `level` indexes on `programs` dropped, so each programme costs fewer writes.

## [1.9.1] - 2026-10-18

### Crawler write budget fix

- The bulk crawler counted SQL statements instead of the rows D1 bills (each insert also writes index rows), so it used about 87% of the free 100,000 daily writes. It now meters the real `rows_written` from D1 responses.
- Daily budget lowered to 60,000 and the stop margin adapts to the measured rows per university.
- If D1 refuses writes the run stops cleanly instead of failing.
- Migration `0009_drop_duplicate_indexes.sql` drops two duplicate indexes on `universities`.

## [1.9.0] - 2026-10-18

### Destination countries limited to popular countries

- New `core/destinations.ts`: 58 destination countries (all of Europe plus RU, TR, CN, MY, SG, AU, CA, US, KR, ZA, JP, AE, PK). Single source for Discover, onboarding, profile validation, search country lookup, `/api/discovery/countries` and the bulk crawler.
- Onboarding lets students pick up to 10 destination countries; the server rejects others.
- Discover dropdown shows only destination countries ("Search destination countries...").

## [1.8.0] - 2026-10-18

### Bulk catalogue of all institutions in the target countries

- `crawler/bulk.ts` and `crawler/bulk-run.ts`: imports every institution in all of Europe plus RU, TR, CN, MY, SG, AU, CA, US, KR, ZA, JP, AE and PK from Wikidata, then crawls each university for all programmes (25 pages, up to 300 programmes) and tags subjects automatically.
- Multilingual subjects and degree levels: Chinese, Russian, Japanese, Korean and Turkish added; generic headings like "Master's programmes" are ignored.
- Only new or changed rows are written; programmes that disappear are marked `removed_at`; outages never wipe data. Refresh every 30 to 33 days per institution. Daily D1 write budget (80,000) tracked in `crawl_budget`.
- Daily gzipped JSON snapshot per changed country, uploaded to the R2 bucket `admitpath-catalog` (no contacts in snapshots).
- Discover answers imported countries instantly from D1 and shows "Checked: X of Y universities"; removed programmes are hidden; `GET /api/discovery/coverage`.
- Migration `0008_bulk_catalogue.sql`. New workflow version in `crawler/crawler.yml` (copy to `.github/workflows/`).
- Tests: `tests/crawler/bulk.test.ts` (9) plus Worker coverage tests; 128 tests passing.

## [1.7.0] - 2026-10-18

### Live crawler with 30-day search cache

- New `crawler/` (Node 22, no dependencies) run by `.github/workflows/crawler.yml` (on dispatch, hourly, or by hand): universities from Wikidata, then each university's own website (robots.txt, rate limits, own user agent) for programme titles and public admissions emails. Results go to D1 through the D1 REST API.
- `search_cache` table (migration `0007`): each country + field search is stored with a JSON snapshot; served from D1 for 30 days, then re-crawled on the next request. Empty results retry after 7 days.
- `POST /api/discovery/jobs` now serves a fresh cached search or queues a crawl (10 new searches per student per day) and can start the GitHub workflow right away (`GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO`). `GET /api/discovery/results` returns the search status.
- Discover page: shows "collecting" status and refreshes every 20 seconds until results arrive; shows the real last crawl time.
- Universities without a ranking now sort after ranked ones.
- Tests: `tests/crawler/crawler.test.ts` (20) and updated `tests/worker/catalog.test.ts`; 117 tests passing (`npm run test:worker`).
- Docs: live crawler section in `docs/crawler.md`.

## [1.6.0] - 2026-10-18

### Discover and catalogue in the Worker

- Ported `/api/universities`, `/api/programs`, their detail routes, `/api/contacts` and all `/api/discovery/*` routes (`docs/catalog.md`). Fixes "Discovery error: Not found."
- Migration `0006_seed_catalog.sql` loads the curated catalogue (30 universities, 25 programs, 7 contacts) into D1, with `last_verified` left empty. Generator: `scripts/gen-catalog-seed.ts`.
- Removed fabrication: the old discovery created a fake "National University of <country>" with fake programs and a fake admissions email when a country had no data. Empty searches now say so.
- Discover page: removed the scripted progress steps and fallback numbers; shows the server's real counts and message.
- Tests: `tests/worker/catalog.test.ts` (10), total Worker tests 92 passing.

## [1.5.0] - 2026-10-18

### Google sign-up and sign-in, onboarding profile

- "Continue with Google" on the login page (`openid email profile`, PKCE, state in D1 plus an HttpOnly cookie against login CSRF). First sign-in creates a student; existing accounts with the same verified email are linked.
- New students go to a 4-step onboarding form (`/onboarding`) before the dashboard. The same form edits the profile later from the Profile page.
- Profile fields chosen for matching and email writing (`docs/profile.md`), with server validation and per-field errors.
- `/api/profile` GET and PUT in the Worker; `/api/auth/me` returns `onboarding_complete`.
- Profile page: fake placeholder data ("Alex Vance", GPA 3.86, etc.) removed; shows "Not set" and an "Edit profile" button. The old "read-only, ask your administrator" banner is gone.
- Migration `0005_google_signin_profile.sql`: `users.google_sub`, `login_states`, new student profile columns.
- Fix: "Continue with Google" always opens Google, even when already signed in, and replaces the old session. Fix: the Google button no longer keeps spinning after pressing Back.
- Fix: OAuth redirect URIs come from `APP_ORIGIN` instead of the request host, which `wrangler dev` rewrites to `http://adminpath.com` (caused `redirect_uri_mismatch`). Dev port pinned to 8787.
- Tests: `tests/worker/signup.test.ts` (27), total Worker tests 82 passing.

## [1.4.0] - 2026-10-18

### Real Gmail connect (Worker) and cookie login in the frontend

- Gmail: real Google OAuth (`gmail.send` + `openid email`, PKCE, hashed single-use state), encrypted refresh and access tokens (AES-256-GCM, `GMAIL_TOKEN_KEY`), token refresh, reconnect on revoked access, disconnect with revoke, test email to the student's own address through the Gmail API. The old demo connect stored fake tokens; migration `0004_gmail_oauth.sql` removes them.
- `gmail.readonly` dropped on purpose (restricted scope needs a paid assessment).
- Frontend: login uses the HttpOnly cookie; `localStorage` tokens, Bearer headers and every `x-impersonate-role` header removed. `src/csrf.ts` adds `X-CSRF-Token` to same-origin POST/PUT/PATCH/DELETE.
- Gmail page: real redirect to Google, result messages, "Reconnect Gmail", test email gate text, plain explanation of the permission.
- Worker: CSRF check is now global for every route.
- `wrangler.toml`: `GOOGLE_CLIENT_ID` var. `package.json`: `gen:gmail-key`.
- Tests: `tests/worker/gmail.test.ts` (26), total Worker tests 55 passing.
- Docs: Worker section and Google Cloud setup in `docs/gmail-oauth.md`.

## [1.3.0] - 2026-10-18

### Cloudflare Worker migration, stage 1 (auth)

- New Worker backend in `worker/` (no runtime dependencies): router, D1 and R2 types, `/api/health`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- Security: HttpOnly session cookie with hashed token storage, per-session CSRF token, same-origin check, email and IP lockout, constant-time password checks. The `x-impersonate-role` header and Bearer tokens are not accepted.
- `migrations/0003_auth_hardening.sql`: session CSRF, IP and user-agent columns, lookup indexes; clears old raw-token sessions.
- `wrangler.toml`: `main` is now `worker/index.ts`, `[assets]` serves `dist/`, auth settings added to `[vars]`.
- `package.json`: `test:worker`, `typecheck:worker`, `worker:dev`, `worker:deploy`, `db:migrate:local`, `db:migrate:remote`, `create-user`; Wrangler added as a dev dependency.
- `scripts/create-user.ts` replaces seeded demo passwords for the Worker.
- Tests: `tests/worker/auth.test.ts` (29 passing).
- Docs: `docs/worker-migration.md`, Worker section in `docs/auth.md`, updated `docs/deployment.md`.

## [1.2.1] - 2026-10-18

### Deployment config cleanup

- `wrangler.toml` is now flat: `routes` moved to the top level and `[env.production]` removed, so vars, D1 and R2 bindings and routes all apply with a plain `wrangler deploy`.
- Removed `.env.production` (it duplicated `wrangler.toml` and nothing read it).
- `server.ts` no longer falls back to built-in values for `DATA_ENCRYPTION_KEY` and `STRIPE_WEBHOOK_SECRET` when `NODE_ENV=production`; it fails at startup instead. Dev fallbacks are unchanged.
- Added `docs/deployment.md`.

## [1.2.0] - 2026-10-14

### AdminPath Light Editorial Theme Migration

- **Visual Design Transformation**:
  - Implemented high-contrast editorial light aesthetic with `#f4f6f8` canvas and `#ffffff` component cards.
  - Added `Newsreader` serif typography for headers and section titles, paired with `Plus Jakarta Sans` for body text.
  - Styled sidebar with white background, subtle border, dark slate brand icon, and green-outlined active state pills (`border border-[#047857] bg-[#f0fdf4] text-[#064e3b]`).
  - Added new **Daily** overview dashboard displaying the exact metrics, lead source comparison table, and conversion funnel bars in pine green (`#047857`), ochre (`#c2410c`), and slate blue (`#2563eb`).
  - Reskinned all 10 core pages (Discover, Programs, Leads, Profile, Matcher, Emails, Outbox, WhatsApp/Replies, Settings, Docs).
- **Documentation**: Added comprehensive step-by-step documentation in `docs/theme-migration.md`.

## [1.1.0] - 2026-10-14

### UI & Navigation Overhaul

- **Sidebar Navigation Layout**:
  - Replaced top horizontal scrolling navbar with a responsive vertical **Sidebar**.
  - Categorized menu items into intuitive functional groups:
    - **Discovery**: University Directory, Program Catalog, Public Contacts.
    - **Admissions Engine**: Profile & Documents, Admissions Matcher.
    - **Outreach & Pipeline**: Compose & Review, Outbox Queue, Sent & Replies.
    - **System & Tools**: Settings & OAuth, Docs & Unit Tests.
  - Added desktop collapsible toggle (expand/compact mode with tooltips).
  - Added mobile responsive drawer with slide-in animation and backdrop.
  - Relocated background lanes widget (Crawler Lane & Mailer Lane) and student profile badge into the sidebar footer.
  - Implemented top status bar with active section title and quick delivery metrics.

## [1.0.0] - 2026-10-14

### Initial Full-Stack Release

- **Core Architecture**:
  - Implemented dual-runtime architecture: Python core modules (`core/`, `scrapers/`, `tests/`) and full Express + Node 22 native SQLite engine (`server.ts`) for zero-lag dev/production serving.
  - SQLite database initialized in WAL (`Write-Ahead Logging`) mode with foreign key integrity.
  - Configurable `.env` parameters for server ports, database location, deliverability caps, and OAuth credentials.
- **Authentication & Security**:
  - Email/password user signup and login with secure salted PBKDF2 hashing.
  - Strict password rules (minimum 8 characters, letters and numbers required).
  - Server-side sessions with CSRF tokens, secure cookie flags, and IP-aware login failure rate-limiting.
  - Per-user multi-tenant data isolation across all resources (profiles, documents, shortlists, drafts, outbox, sent logs).
- **University Directory & Program Database**:
  - Seeded 100+ universities across 16 countries: USA, Canada, UK, Germany, Netherlands, France, Italy, Spain, Sweden, Finland, Ireland, Australia, South Korea, Indonesia, Malaysia, South Africa.
  - Detailed catalog of 200+ undergraduate, graduate, and doctoral programs with tuition ranges, deadlines, and intake months.
  - Fast multi-criteria search and filter by country, degree level, subject discipline, and budget.
- **Public Contact Extractor & Web Crawler**:
  - Extractor for public admissions, international office, and academic department contacts.
  - Strict compliance: never probes SMTP, never scrapes behind logins, parses only public HTML.
  - Role-based vs personal email classification.
  - Robots.txt parsing, domain concurrency throttling (1-2), and polite delay backoff.
- **Student Profile & Admissions Matcher**:
  - Academic profile manager (degree, GPA, English scores, research experience, budget).
  - Multi-factor recommendation algorithm scoring subject alignment, degree level, budget compatibility, English proficiency requirements, and application deadlines.
  - Human-readable score breakdown and decision rationale.
- **Document Vault**:
  - Upload handling for degree certificates, transcripts, CVs, and motivation letters.
  - 20 MB total per-email attachment size check and MIME type validation.
- **Personalized Email Composer**:
  - Dynamic template generator supporting academic inquiries, research lab fit, scholarship requests, and graduate admissions.
  - Hook insertion for specific faculty research or departmental curriculum highlights.
  - Dual MIME parts: clean plain text + accessible HTML.
  - Mandatory sender signature and opt-out unsubscribe instructions ("Reply 'stop' and I will not write again").
  - Mandatory student preview and approval gate before queue insertion.
- **Deliverability, Limits & Timezone Windows**:
  - Daily sending cap with automatic ramp-up schedule (20 -> 30 -> 40 emails/day).
  - Randomized delivery gaps (60 to 240 seconds).
  - Local recipient timezone window enforcement (sending allowed strictly between 08:00 and 17:00 recipient local time).
  - Single-recipient per university policy with 7-day minimum follow-up spacing.
  - Automated pause trigger if bounce rate exceeds 5% or rate limits are encountered.
- **Compliance & Privacy**:
  - Do-not-contact suppression list with instant opt-out parsing.
  - GDPR right-to-be-forgotten user account and data deletion.
  - Full personal data export in JSON format.
  - Built-in regional regulatory disclosures (GDPR/PECR, CASL, CAN-SPAM).
- **Test Suite**:
  - Complete Python unittest suite covering auth, extractors, contacts, matcher, composer, timezone windows, limits, and suppression.
