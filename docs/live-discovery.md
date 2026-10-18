# Live Discovery

## What was built
- Discover shows universities in pages of 15 for the chosen country, field and level. Each card lists that university's programmes.
- Programmes are no longer pre-crawled for every university. The GitHub bulk crawler only records which subjects and levels each university teaches (`university_subjects`). Programmes are crawled live when a student clicks Start Discovery, then saved for 30 days.
- The browser drives the crawl one page per request, so every Worker request stays small (one page, one parse) and fits the free plan.
- After the visible page is done, the browser keeps checking the next pages in the background while the tab is open. Next 15 shows them straight away.

## Files changed
- `migrations/0011_live_discovery.sql`: `university_subjects`, `live_crawls`, `institution_queue.tags`, `crawl_budget.live_crawls`, backfill from `program_search`.
- `worker/lib/live.ts`: page fetch with robots.txt (cached 1 day), a per-host gap of 1.5 s (Workers Cache), 12 s timeout, 200 KB cap, same-site redirect check.
- `worker/routes/live.ts`: `GET /api/discovery/institutions`, `POST /api/discovery/live/start`, `/step`, `/finish`.
- `crawler/extract.ts`: `analyzePage` (one pass per page), faster anchors, emails and link scoring.
- `crawler/fields.ts`: one combined regex per field.
- `crawler/wikidata.ts`: cached `registrableDomain`.
- `crawler/bulk.ts`, `crawler/bulk-run.ts`: `BULK_MODE` `tags` (default) or `full`.
- `src/components/DiscoverView.tsx`: university cards, live progress, pages of 15, background crawl.
- `src/components/ProgramDetailsModal.tsx`: duration shows "Not listed" when unknown.

## How it works
1. `GET /api/discovery/institutions?country_code=AU&field=Computer Science&level=Master&page=0` lists universities tagged with the subject and level (ranking, then size), then universities whose subjects are not known yet (largest first). Universities already checked live with nothing found are left out of the second group. Each item has `status`: `fresh` (checked in the last 30 days), `running`, `stale` or `new`, plus saved programmes.
2. Start Discovery: for each `new` or `stale` university (4 at a time) the browser calls `live/start`. The server checks the caps and claims the university for 15 minutes for that student.
3. The browser calls `live/step` with one URL at a time (start page first, then the best-scored links, depth up to 2, up to 8 pages). The server only fetches pages on the university's own domain, respects robots.txt and the host gap (answers `wait` with `retry_after_ms`), extracts programmes for the field and saves them (`programs`, `program_search`, `university_subjects`, up to 3 public role contacts).
4. `live/finish` marks the university done for that subject and adds its row writes to `crawl_budget`, so the bulk crawler's daily budget includes live writes.

## How to run
- `npm run db:migrate:remote` (applies 0011).
- Deploy the Worker as usual. The crawler workflow needs no change; it now runs in tags mode by default.

## Config
- `LIVE_CRAWLS_PER_DAY` (optional var, default 400): universities checked live per day across all students.
- Per student: 60 universities a day (code constant `LIVE_PER_USER_DAY`).
- Crawler: `BULK_MODE` (`tags`), `BULK_MAX_PAGES` (12).

## Limits
- Free Workers allow 10 ms CPU per request. Measured locally (warm): ~6 ms for a 100 KB page with 400 links, 11 to 30 ms for 250 to 600 KB pages. Pages are cut at 200 KB. A request stopped by Cloudflare counts as a skipped page; the bulk crawler still covers that university's subjects.
- Live crawling only runs while the student's tab is open. Unfinished universities are released after 15 minutes.
- The first search for a country and subject takes about 10 to 20 s per university (8 pages, 1.5 s apart); cards fill in as pages finish.
- Tags from the bulk crawl are hints: a university whose pages did not show a Master's programme is not listed under Master until a live check finds one.

## Tests
`tests/worker/live.test.ts`: listing order and statuses, start/step/finish with claim checks, off-site URLs rejected, programmes and tags saved, duplicate pages do not duplicate rows, robots.txt, 8-page cap, daily and per-student limits, unchecked list filtering, state ageing. `tests/crawler/bulk.test.ts`: tags mode writes no programmes and skips unchanged tags.

## Unverified
- Real CPU time per request on Cloudflare (check Workers Observability after deploy).
- Workers Cache behaviour for robots.txt and the host gap across data centres.
