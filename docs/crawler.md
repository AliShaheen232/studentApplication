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
