# Catalogue and Discover (Worker)

## What was built
- Migration `0006_seed_catalog.sql` loads the curated catalogue from `core/globalCatalog.ts` into D1: 30 universities in 11 countries, 25 programs, 7 public admissions contacts.
- Routes in `worker/routes/catalog.ts`:
  - `GET /api/universities`, `GET /api/universities/:id`, `GET /api/programs`, `GET /api/programs/:id` (public; contacts only included when signed in).
  - `GET /api/contacts` (sign-in required).
  - `GET /api/discovery/countries`, `GET /api/discovery/fields`, `GET /api/discovery/results`.
  - `POST /api/discovery/jobs`, `GET /api/discovery/jobs`, `GET /api/discovery/jobs/:id` (sign-in, CSRF, per student).

## How it works
- Discover searches the catalogue in D1 by country (name or code), field (subject category or program name), level, text and max tuition. Search text is escaped so `%` and `_` are literal.
- A discovery job records what was searched and the real counts. If nothing matches, the job is `completed_with_warnings` and says so.
- The old Express version invented a "National University of <country>" with a made-up website, programs and an `admissions@<country>uni.edu` contact whenever a country had no data. That is removed; nothing is ever fabricated. The Discover page's scripted "inspecting catalogues" steps and fallback numbers (8 institutions, 14 programmes, 32 pages) are also removed.

## How to run
- Apply: `npm run db:migrate:remote`.
- After editing `core/globalCatalog.ts`, regenerate the SQL with `node --experimental-strip-types scripts/gen-catalog-seed.ts > migrations/0007_catalog_update.sql` (use a new file number, D1 only runs each migration once).

## Known limits
- The catalogue is small and hand-curated (AI-assisted). Tuition, deadlines and contacts are not verified: `last_verified` and `fetched_at` are NULL. Check a contact's source page before emailing it.
- Countries outside the 11 seeded ones return no results until the crawler (stage 3) fills them.
- `pagesInspected` is always 0 because nothing is crawled yet.

## Tests
`tests/worker/catalog.test.ts`: seed counts and NULL verification dates, country and field lists, country/field filters with real counts, level filter, no fabrication for empty countries, job counts, job login/CSRF/privacy, LIKE escaping, list and detail routes, contacts behind login.
