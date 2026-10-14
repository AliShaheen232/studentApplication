# Changelog - AdmitPath

All notable changes to the AdmitPath application will be documented in this file.

## [1.2.0] - 2026-10-14

### Websentry Light Editorial Theme Migration
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
