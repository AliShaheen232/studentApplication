# Catalogue and Discover (Worker)

## What was built
- Migration `0006_seed_catalog.sql` loads the curated catalogue from `core/globalCatalog.ts` into D1: 30 universities in 11 countries, 25 programs, 7 public admissions contacts.
- Routes in `worker/routes/catalog.ts`:
  - `GET /api/universities`, `GET /api/universities/:id`, `GET /api/programs`, `GET /api/programs/:id` (public; contacts only included when signed in).
  - `GET /api/contacts` (sign-in required).
  - `GET /api/discovery/countries`, `GET /api/discovery/fields`, `GET /api/discovery/results`.
  - `/api/discovery/countries` returns only the 58 destination countries from `core/destinations.ts`. The same list drives the Discover dropdown, onboarding chips, search country lookup and the bulk crawler's default countries. Other countries are rejected by search.
  - `POST /api/discovery/jobs`, `GET /api/discovery/jobs`, `GET /api/discovery/jobs/:id` (sign-in, CSRF, per student).

Discover now uses live discovery by university (pages of 15); see `docs/live-discovery.md`. `/api/discovery/results` stays for programme lists.

## How it works
- Discover needs a destination country, a field of study (one of the 18 in `FIELDS_OF_STUDY`) and a study level (Bachelor, Master, PhD, MBA). Budget (max tuition per year) and a keyword are optional. Anything else returns 400.
- Results come from `program_search` (migration `0010_program_search.sql`): one row per programme and subject, primary key `(country_code, subject, level, rank_sort, program_id)`, `WITHOUT ROWID`. The query is a primary-key range scan already in result order, so D1 reads only the rows on the page (about 50 per table), not the whole country.
- 50 results per page (`page=0,1,...`, `has_more`). Discover shows "Load 50 more".
- Budget keeps programmes at or under the limit and those with no listed fee (shown as "Fee not listed").
- Responses for covered countries (and ready searches) are kept in the Workers Cache for 30 minutes, keyed by country, field, level, budget, keyword and page. Repeated searches cost no D1 reads.
- Coverage ("Checked X of Y") is read from counters on `crawl_countries` (one row) that the crawler keeps up to date, instead of counting `institution_queue` on every search.
- Keyword search text is escaped so `%` and `_` are literal.
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
`tests/worker/catalog.test.ts`: seed counts and NULL verification dates, country and field lists, required country/field/level, budget with unlisted fees, pages of 50, edge cache on repeats, no fabrication for empty countries, job counts, job login/CSRF/privacy, LIKE escaping, list and detail routes, contacts behind login.
