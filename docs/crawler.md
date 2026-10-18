# Web Crawler & Public Contact Finder (`docs/crawler.md`)

## Overview
AdmitPath includes a crawler and extractor pipeline designed to extract academic programs and verified public admissions contacts while strictly adhering to ethical crawling rules.

## Core Rules & Ethics
- **Public Data Only**: The crawler only queries publicly accessible admissions pages, departmental directories, course catalogs, and faculty contact pages.
- **Never Guess or Probe**: The system never guesses email patterns (e.g. `first.last@univ.edu`) and never conducts SMTP probe handshakes.
- **No Login Scraping**: Password-protected portals, intranet directories, and behind-the-wall student systems are strictly prohibited.
- **Robots.txt & Rate Limits**:
  - Respects `robots.txt` Disallow directives.
  - Per-domain concurrency limit: 1-2 concurrent connections max.
  - Delay between requests: 1 to 3 seconds with exponential backoff on 429/503 responses.
  - Caching enabled to avoid duplicate downloads of static pages.
  - Resumable jobs stored in the `crawl_jobs` table.

## Adapters
1. **Generic Course Catalog Adapter**: Standard course list parser extracting program titles, degree level (bachelor, master, PhD), durations, and deadlines.
2. **Country-Specific Adapters**:
   - `scrapers/usa.py`: Handles common US college catalog structures (credits, semesters, GRE/TOEFL requirements).
   - `scrapers/uk.py`: Handles UK UCAS / Postgraduate taught course formats.
   - `scrapers/canada.py`: Handles Canadian degree structures.
   - `scrapers/germany.py`: Handles DAAD / German university structures (NC, winter/summer semester, ECTS).
3. **Contact Finder**:
   - Locates public admissions, graduate admissions, and international office emails.
   - Categorizes emails as `role` (e.g. `admissions@university.edu`, `gradschool@...`) or `personal` (e.g. `jane.smith@...`).
   - Stores exact `source_url` and `fetched_at` timestamp for auditability.
   - Contacts older than 90 days are flagged for re-verification.

## Verification & Testing
- Unit tests in `tests/test_extractors.py` and `tests/test_contacts.py` test extractor accuracy on mock HTML snapshots without live network calls.

## Live crawler (GitHub Actions, current)
This replaces the parser stubs in `scrapers/` for real use.

### Flow
1. A student clicks Start Discovery. `POST /api/discovery/jobs` looks up `search_cache` by key `<COUNTRY_CODE>|<field, lower-cased>`.
2. Fresh entry (newer than 30 days): served from D1 immediately, no crawl.
3. Missing, older than 30 days, or failed: the entry is set to `pending` (old results stay visible) and the Worker triggers the GitHub workflow through `repository_dispatch` if `GITHUB_DISPATCH_TOKEN` is set. The hourly schedule picks it up otherwise.
4. `.github/workflows/crawler.yml` runs `crawler/run.ts`, which claims pending searches (max 3 per run, 25-minute budget), crawls, and writes to D1 over the Cloudflare D1 REST API.
5. The Discover page shows "Collecting ... 5 to 15 minutes" and polls every 20 seconds until the search is ready.

### What the crawler does (`crawler/`)
- `wikidata.ts`: universities in the country from Wikidata (instance of university, has an official website, not dissolved), largest first, deduplicated by domain. Falls back to a simpler query if the full one times out.
- `fetcher.ts`: one `AdmitPathBot/1.0` user agent, robots.txt (including Allow, wildcards and Crawl-delay), at least 1.5 s between requests to the same host, 15 s timeout, HTML only, 2 MB cap, one retry on 429/503, host skipped after 403.
- `job.ts`: for each university (top 40, 8 in parallel, different hosts), start at the homepage and follow up to 10 same-site pages that look like study or programme pages, preferring links that mention the field.
- `extract.ts`: programme titles from links, headings and list items that contain both a degree marker (M.Sc., MSc, Master of, B.Sc., Bachelor, Ph.D., Doctorate, MBA, LL.M., M.A. ...) and a field keyword. On a page that is clearly a Master's or Bachelor's listing, short field-matching link titles take that level. News, events, apply, deadlines, modules, lectures and similar noise are dropped. Public emails on the university's own domain are kept (role addresses like admissions@ and international@ first, then name.surname@ as personal); press, privacy, noreply and outside domains are dropped.
- `fields.ts`: multilingual keywords per field (for example Computer Science also matches Informatik, Informatique, Informática, Computing) plus the subfields from `core/discoveryData.ts`. Custom search terms use their own words.

### Storage
- `search_cache` (migration `0007`): status, counts, pages inspected, `fetched_at`, `expires_at` (30 days, or 7 days when nothing was found), `last_error`, and `results_json`, the JSON snapshot of the search.
- The same programmes are upserted into `programs` (`source_type = 'official_website'`, `source_url` = the page they came from, `last_verified` = crawl time); a programme found by two searches gets both subjects in `subject_category`. Universities are upserted by domain (seeded names and ids are kept). Contacts are upserted per university and email with `fetched_at`.
- Each run also uploads the JSON snapshots as a workflow artifact (`crawler/output/*.json`, kept 14 days).
- Nothing is invented: tuition, deadline and requirements stay empty unless a later adapter reads them.

### Setup
0. Move `crawler/crawler.yml` to `.github/workflows/crawler.yml` (create the folders), commit and push. GitHub only runs workflows from that folder.
1. Cloudflare dashboard > My Profile > API Tokens > Create Token > Custom: permission Account > D1 > Edit, for your account. Copy the token.
2. GitHub repo > Settings > Secrets and variables > Actions > New repository secret: `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID`. The database ID is read from `wrangler.toml`.
3. Optional, for instant start instead of the hourly run: create a GitHub fine-grained token for this repo only with "Contents: Read and write" (needed for repository_dispatch), then `npx wrangler secret put GITHUB_DISPATCH_TOKEN` and add it to `.dev.vars` too. `GITHUB_REPO` is in `wrangler.toml`.
4. Apply migration `0007` with `npm run db:migrate:remote`.
5. Test by hand: GitHub > Actions > Discovery crawler > Run workflow. Or locally: set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell, then `npm run crawl`.

### Limits and cost
- GitHub Actions is free for public repos; private repos get 2,000 free minutes a month. The hourly schedule uses about 720 short runs a month; each crawl takes roughly 3 to 10 minutes.
- Limits per student: 10 new searches a day. Saved searches are unlimited.
- Config (env in the workflow): `CRAWL_MAX_JOBS` (3), `CRAWL_MAX_UNIVERSITIES` (40), `CRAWL_MAX_PAGES` (10), `CRAWL_CONCURRENCY` (8), `CRAWL_TIME_BUDGET_MIN` (25).
- Sites that render programme lists with JavaScript only, or block bots, give fewer results. Wikidata misses some small institutions.

### Tests
`tests/crawler/crawler.test.ts` (20): robots rules, registrable domains, Wikidata parsing and fallback query, multilingual field matching, degree detection, programme extraction with noise, language hints, context levels, email rules, link scoring, polite fetcher (robots, non-HTML, 403 block, user agent), full pipeline into D1 with JSON snapshot and 30-day expiry, idempotent re-runs, subject merging, empty results with 7-day retry, exclusive claiming, stuck-job requeue and failure after 3 attempts. Worker side in `tests/worker/catalog.test.ts`.

### Unverified
- Not yet run against live university websites or the live Wikidata endpoint; the build machine has no outside network. First real run: Actions > Discovery crawler > Run workflow, then check the log and the JSON artifact.
