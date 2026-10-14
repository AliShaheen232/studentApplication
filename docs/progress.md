# AdmitPath Development Progress

## Roadmap & Phase Status

- [x] **Phase 1: Project Skeleton, DB Schema, Configuration & Documentation System**
  - Status: Completed.
  - Implemented: Project layout, core/ configuration, SQLite schema with WAL mode & foreign keys, database indices, .env config, and documentation foundation.
- [x] **Phase 2: Authentication System & User Data Isolation**
  - Status: Completed.
  - Implemented: Email/password signup, password strength rules, secure salted PBKDF2/Argon2 hashing, server-side sessions with CSRF & SameSite protection, login rate-limiting & lockout, multi-tenant per-user data isolation.
- [x] **Phase 3: University Directory Seed & Search Engine**
  - Status: Completed.
  - Implemented: Seeding from open datasets (Hipo, Wikidata, Open academic registers) across 16 countries (USA, Canada, UK, Germany, Netherlands, France, Italy, Spain, Sweden, Finland, Ireland, Australia, South Korea, Indonesia, Malaysia, South Africa). Real-time search, filters (country, subject, level, tuition, intake months, ranking).
- [x] **Phase 4: Program Crawler & Public Contact Finder**
  - Status: Completed.
  - Implemented: Generic course catalog adapter and country adapters (USA, UK, Canada, Germany). Public contact extractor for admissions, international offices, and departments. Distinguishes role vs personal emails. Respects robots.txt, 1-2 per-domain concurrency, delay backoff, verified timestamps.
- [x] **Phase 5: Student Profile, Documents Vault & Matching Engine**
  - Status: Completed.
  - Implemented: Comprehensive student profile (GPA, nationality, target degree, subjects, budget, English scores, experience). Document vault with size enforcement (<20MB), MIME check, encryption metadata. Weighted matching engine with detailed score breakdowns and reasons.
- [x] **Phase 6: Personalized Email Composer & Review Workflow**
  - Status: Completed.
  - Implemented: Template variants (Academic Inquiry, Research/Lab fit, Scholarship/Aid, Graduate Admissions). Dynamic profile + program + lab hook interpolation. Plain text and HTML generation. Mandatory sender identity and unsubscribe line ("Reply 'stop' and I will not write again"). Preview and approval gate.
- [x] **Phase 7: Gmail OAuth & Outbox Sending Engine**
  - Status: Completed.
  - Implemented: Google OAuth integration setup, token storage, MIME multipart builder. Daily send cap with ramp-up schedule (20 -> 30 -> 40), random interval pauses (60-240s), recipient local timezone window enforcement (08:00 - 17:00), 7-day follow-up interval constraint.
- [x] **Phase 8: Deliverability, Replies, Bounce Tracking & Compliance**
  - Status: Completed.
  - Implemented: Bounce rate threshold monitor (auto-pauses queue if >5%), thread and reply tracking, opt-out suppression list (global and per-user), GDPR right-to-be-forgotten deletion and data export, regulatory disclosures (GDPR/PECR, CASL, CAN-SPAM).
- [x] **Phase 9: Documentation, Unit Testing Suite & Polish**
  - Status: Completed.
  - Implemented: Full test suite passing 100% across auth, extractors, contacts, matcher, tzwindow, composer, sending limits, and suppression. Rich modern UI with live interactive preview.
- [x] **Phase 10: AdminPath Light Editorial Theme Overhaul**
  - Status: Completed.
  - Implemented: High-contrast light aesthetic (`#f4f6f8` background, `#ffffff` cards), `Newsreader` editorial serif typography, green-outlined active sidebar pills, Daily analytical dashboard with live metrics, lead source comparison table, and dual funnel charts. Full documentation in `docs/theme-migration.md`.
