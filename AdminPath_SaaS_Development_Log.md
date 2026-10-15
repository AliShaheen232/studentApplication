# AdminPath SaaS Development Log

**Document Version:** 1.0.0  
**Project:** AdminPath - Global University Admissions & Outreach SaaS Platform  
**Target Environment:** AI Studio Node.js 22 Runtime + Express + SQLite (WAL Mode) + Vite/React 19 + Tailwind CSS  
**Created:** 2026-10-15

---

## A. Project Overview

### Original Architecture

- Full-stack university discovery and outreach engine.
- Express + Vite middleware backend (`server.ts`) with `node:sqlite` in WAL mode.
- Python auxiliary server (`app.py`) with standard library HTTP server and Python unit test suite in `tests/`.
- Single-user / student dashboard with hardcoded student editing capabilities, rudimentary session tokens, and legacy navigation tabs including "Site check" and "Docs & Tests".
- No subscription billing, no multi-tenant student provisioning workflow, no administrator role separation, and no read-only profile protection.

### Target SaaS Architecture

- **Multi-Role Role-Based Access Control (RBAC)**:
  - **Administrator (`admin`)**: Manages subscription plans, views unprovisioned student purchases, provisions and edits student profiles, monitors student usage and sending queues, inspects audit logs, and triggers internal health/test suites.
  - **Student (`student`)**: Accesses personalized dashboard, views strictly read-only academic profile (managed solely by administrator), discovers universities and programmes, reviews AI-matched programmes, generates and edits personalized AI application emails, connects own personal Gmail account via OAuth 2.0, approves drafts, and initiates queue sending via a prominent **Start Sending** control adhering to subscription quotas.
- **Public Marketing & Billing Portal**:
  - Landing page, Features, How it Works, Pricing, Sign In, Terms of Service, Privacy Policy, Contact & Support.
  - Configurable subscription plans (Starter, Scholar Pro, Global Fellow) with customizable pricing, billing intervals, daily sending caps, monthly sending caps, university discovery limits, programme discovery limits, and email generation limits.
  - Idempotent payment processing with checkout session creation, webhook signature verification, and automated generation of unprovisioned student purchase records awaiting administrator completion.
- **Robust University & Programme Discovery**:
  - Global database of institutions and academic programmes across all disciplines (STEM, Business, Humanities, Health, Social Sciences).
  - Multi-criteria filtering (institution name, country, city, degree level, field of study, intake, tuition, language).
  - Clear distinction between official application portals and direct admissions inquiries.
  - SSRF protection on crawler/external verification mechanisms preventing loopback and private subnet probing.
- **AI Email Generation & Human-in-the-Loop Review**:
  - Generates bespoke, programme-specific application emails combining student academic profile, verified programme curriculum, and tailored research hooks.
  - Provider abstraction utilizing `@google/genai` with deterministic fallback generator when API keys are absent.
  - Mandatory draft review, editing, and approval workflow prior to queue eligibility.
- **Dedicated Gmail Account Integration**:
  - Dedicated "Gmail Account" tab for student OAuth connection, status inspection, permission verification, and disconnection.
  - AES-256-GCM encryption of OAuth tokens at rest with tenant isolation.
- **Application Queue & Safeguarded Sending**:
  - Atomic quota reservation and durable job execution.
  - Daily and monthly subscription quota enforcement preventing parallel abuse.
  - 60–240s randomized delivery intervals, recipient local timezone window enforcement (08:00–17:00), 7-day follow-up spacing, bounce circuit breaker (>5.0%), and deduplication protection.
- **Frontend Navigation Restructuring**:
  - Students see: Daily, Discover, Programmes (formerly Leads), Emails, Outbox, Gmail Account, Matches, Profile (Read-Only), Settings.
  - "Site check" removed from student interface.
  - "Docs & Tests" removed from student navigation (retained in administrator internal maintenance and automated test runner).

---

## B. Baseline Assessment

### Repository Structure

- `server.ts`: Express backend serving API routes and Vite dev server. SQLite database initialization using `node:sqlite` DatabaseSync.
- `src/App.tsx`: React 19 single-page application with Tailwind CSS and Lucide icons.
- `core/`: Python legacy modules (`auth.py`, `compose.py`, `config.py`, `db.py`, `gmail.py`, `mailer.py`, `matcher.py`, `pipeline.py`, `seeds.py`, `tzwindow.py`).
- `tests/`: Python unit tests (`test_auth.py`, `test_composer.py`, `test_contacts.py`, `test_extractors.py`, `test_gmail_mime.py`, `test_matcher.py`, `test_sending_limits.py`, `test_suppression.py`, `test_tzwindow.py`).
- `scrapers/`: Directory scrapers for US, UK, Canada, Germany.
- `docs/`: Technical specifications for auth, crawler, gmail-oauth, sending limits, compliance.

### Baseline Test Commands & Results

- **Python Unit Tests**: `python3 -m unittest discover tests`
  - Result: Ran 25 tests in 0.420s - OK (25/25 passed).
- **TypeScript Typecheck**: `npm run lint` (`tsc --noEmit`)
  - Result: Exit code 0, no errors.
- **Vite Build / Compilation**: `compile_applet`
  - Result: Build succeeded.

### Identified Gaps & Required Improvements

1. **No Subscription Data Model & Webhook Flow**:
   - Subscriptions, plans, payments, and unprovisioned student purchase records did not exist in the database schema.
2. **Missing Admin / Student Role Enforcement**:
   - `students` profile endpoint allowed any authenticated user to overwrite their own profile. Needed to be restricted to administrators only.
   - Profile UI had editable input fields and a "Save Profile" button; needed conversion to read-only presentation for students.
3. **Public SaaS Website Missing**:
   - Application directly mounted the dashboard for the demo student without public marketing pages, plan comparison, and checkout flow.
4. **Sidebar Navigation Compliance**:
   - Sidebar contained "Site check" and "Docs & Tests" in student view; needed clean removal and replacement with "Programmes" and "Gmail Account".
5. **Atomic Quota & Idempotent Sending**:
   - Sending queue checked ramp cap, but not subscription plan daily/monthly caps or atomic reservation.
6. **SSRF Defense Missing on External Crawling**:
   - Crawler endpoints lacked IP/hostname validation against private networks, AWS metadata (`169.254.169.254`), and localhost.

---

## C. Step-by-Step Development Log

### Step 01 - Repository Audit & Baseline Verification

- **Date/Time:** 2026-10-15 07:15
- **Objective:** Audit full codebase, verify package managers, run baseline test suites, verify TypeScript compilation.
- **Files Inspected:** `package.json`, `server.ts`, `src/App.tsx`, `README.md`, `tsconfig.json`, `app.py`.
- **Files Created:** `AdminPath_SaaS_Development_Log.md`.
- **Files Removed:** `bun.lock` (cleaned up per Node.js/npm standards).
- **Commands Executed:**
  - `python3 -m unittest discover tests` -> 25 tests passed.
  - `npm run lint` -> Passed with 0 errors.
  - `compile_applet` -> Succeeded.
- **Status:** Completed.

### Step 02 - Data Model and Database Migrations

- **Date/Time:** 2026-10-15 07:18
- **Objective:** Design and implement relational SaaS schema entities for plans, subscriptions, payments, webhooks, usage ledgers, audit logs, and encrypted Gmail tokens.
- **Files Modified:** `server.ts`.
- **Schema Additions:**
  - `subscription_plans`: Plan pricing, daily/monthly sending caps, discovery limits, feature entitlements.
  - `subscriptions`: Customer email, plan ID, student link, status (`active`, `awaiting_provisioning`, `cancelled`).
  - `payments`: Amount, currency, provider payment ID, idempotency key, status.
  - `webhook_events`: Idempotent webhook event ledger preventing duplicate event processing.
  - `usage_ledger`: Daily per-user counters for emails sent, discovery searches, and AI drafts.
  - `audit_logs`: Immutable tracking of administrative provisioning, profile updates, and sending batches.
  - `gmail_tokens`: AES-256-GCM encrypted refresh/access tokens, scopes, and connection health status.
  - `students`: Extended with `country_of_residence`, `qualification`, `intake_term`, `preferred_universities`, `academic_achievements`, `additional_preferences`, `status`, `activation_token`, `is_provisioned`.
- **Status:** Completed.

### Step 03 - Role-Based Access Control & Profile Read-Only Security

- **Date/Time:** 2026-10-15 07:20
- **Objective:** Implement RBAC (`admin` vs `student`) and strictly block student profile modifications on the backend.
- **Files Modified:** `server.ts`.
- **Implementation:**
  - Added `requireAuth` and `requireAdmin` middleware.
  - `POST /api/profile` and `PUT /api/profile`: When called by a user with role `student`, returns HTTP 403 Forbidden with `{ error: 'Profile modification is restricted...', code: 'STUDENT_PROFILE_READ_ONLY' }`.
  - Only authorized administrators can update student profile information via `/api/admin/students/:id`.
- **Status:** Completed.

### Step 04 - Administrator Student Provisioning Workflow

- **Date/Time:** 2026-10-15 07:22
- **Objective:** Build administrator APIs to view unprovisioned student purchases, provision student accounts with complete academic credentials, edit profiles, suspend/activate accounts, and reset credentials.
- **Files Modified:** `server.ts`.
- **Endpoints Added:**
  - `GET /api/admin/metrics`: Platform-wide summary statistics.
  - `GET /api/admin/students`: Full student directory with subscription & Gmail status.
  - `POST /api/admin/students`: Provision new student account or link an awaiting purchase.
  - `PUT /api/admin/students/:id`: Update academic records.
  - `PATCH /api/admin/students/:id/status`: Suspend / activate accounts.
  - `POST /api/admin/students/:id/reset-credentials`: Generate temporary credentials & activation links.
  - `GET /api/admin/subscriptions`: View all subscriptions including `awaiting_provisioning`.
  - `GET/PUT /api/admin/plans`: Inspect and configure plan limits dynamically.
  - `GET /api/admin/audit-logs`: Audit trail inspection.
- **Status:** Completed.

### Step 05 - Public SaaS Website & Payment Webhook Flow

- **Date/Time:** 2026-10-15 07:26
- **Objective:** Build public website and Stripe/payment gateway webhook integration with signature verification and idempotency.
- **Files Created:** `src/components/PublicWebsite.tsx`.
- **Files Modified:** `server.ts`.
- **Endpoints Added:**
  - `GET /api/public/plans`: Returns active subscription plans.
  - `POST /api/public/checkout`: Creates checkout session for student email.
  - `POST /api/webhooks/payment`: Verifies webhook event, enforces idempotency, activates subscription, and creates `awaiting_provisioning` subscription if student is not yet created.
- **Status:** Completed.

### Step 06 - SSRF Protection & University Discovery

- **Date/Time:** 2026-10-15 07:25
- **Objective:** Add SSRF defense mechanism to validate URLs before crawling or verifying external university links.
- **Files Modified:** `server.ts`.
- **Implementation:**
  - `isSafePublicUrl`: Validates protocol (`http:`, `https:`), rejects `localhost`, `127.0.0.1`, cloud metadata `169.254.169.254`, and private subnets (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`).
  - Tested against simulated malicious URL payloads.
- **Status:** Completed.

### Step 07 - Dedicated Gmail Account Integration

- **Date/Time:** 2026-10-15 07:28
- **Objective:** Implement dedicated Gmail Account management tab and backend endpoints.
- **Files Created:** `src/components/GmailTab.tsx`.
- **Files Modified:** `server.ts`.
- **Endpoints Added:**
  - `GET /api/gmail/status`: Returns authorization state, connected email, and scopes without leaking credentials.
  - `POST /api/gmail/connect`: Connects student Gmail account with encrypted token storage.
  - `POST /api/gmail/disconnect`: Clears tokens and suspends outreach sending.
  - `POST /api/gmail/test`: Dispatches deliverability verification ping.
- **Status:** Completed.

### Step 08 - "Start Sending" Application Queue & Atomic Quotas

- **Date/Time:** 2026-10-15 07:31
- **Objective:** Add prominent Start Sending control with atomic daily and monthly subscription quota reservation.
- **Files Created:** `src/components/StartSendingModal.tsx`.
- **Files Modified:** `server.ts`.
- **Endpoints Added:**
  - `POST /api/queue/start-sending`: Enforces plan daily cap, checks Gmail connection, validates suppression list and 7-day follow-up pause, dispatches eligible approved drafts, updates `usage_ledger`, and returns comprehensive dispatch summary.
- **Status:** Completed.

### Step 09 - Read-Only Student Profile Frontend

- **Date/Time:** 2026-10-15 07:27
- **Objective:** Transform student profile to read-only mode, remove Save Profile button, disable editing inputs, and display administrator-managed banner.
- **Files Created:** `src/components/StudentProfile.tsx`.
- **Status:** Completed.

### Step 10 - Administrator Dashboard Frontend

- **Date/Time:** 2026-10-15 07:29
- **Objective:** Build administrator control center for student provisioning, subscription approvals, plan adjustments, and internal health diagnostics.
- **Files Created:** `src/components/AdminDashboard.tsx`.
- **Status:** Completed.

### Step 11 - Frontend Navigation Cleanup & App Integration

- **Date/Time:** 2026-10-15 07:32
- **Objective:** Update `src/App.tsx` sidebar to match specification: keep Daily, Discover, Programmes (formerly Leads), Emails, Outbox, Gmail Account, Matches, Profile (Read-Only), Settings; remove Site check and Docs & Tests from student view. Add multi-role switcher pill.
- **Files Modified:** `src/App.tsx`.
- **Status:** Completed.

### Step 14 - Country-First Academic Discovery Engine & Durable Jobs

- **Date/Time:** 2026-10-15 07:45
- **Objective:** Build real discovery engine with global ISO-3166-1 country list (190+ sovereign countries), academic fields taxonomy (20+ disciplines), and durable discovery jobs (`discovery_jobs` table) with progress tracking.
- **Files Created/Modified:** `core/discoveryData.ts`, `core/globalCatalog.ts`, `src/data/countries.ts`, `server.ts`.
- **Status:** Completed.

### Step 15 - Distinct Programme Modeling & Dynamic Study-Level Derivation

- **Date/Time:** 2026-10-15 07:50
- **Objective:** Separate combined institutional cards into distinct degree-level opportunities (e.g. Master vs. PhD at TUM). Compute dynamic study-level filter buttons strictly derived from the returned search results without hardcoded static pills.
- **Files Created/Modified:** `src/components/DiscoverView.tsx`, `core/globalCatalog.ts`, `server.ts`.
- **Status:** Completed.

### Step 16 - Programme Details Modal & Direct Email Inquiry Pipeline

- **Date/Time:** 2026-10-15 07:52
- **Objective:** Implement comprehensive Programme Details modal displaying curriculum, prerequisites, tuition, intake, verified contacts, and direct "Send Email Inquiry" action drafting personalized outreach.
- **Files Created/Modified:** `src/components/ProgramDetailsModal.tsx`, `src/App.tsx`.
- **Status:** Completed.

### Step 17 - Cloudflare D1 & R2 Document Storage Vault Integration

- **Date/Time:** 2026-10-15 07:54
- **Objective:** Provision Cloudflare D1 schema migrations (`0001_initial_schema.sql`, `0002_d1_schema.sql`), `wrangler.toml` bindings, and student document vault (`r2_storage_objects`) with AES-256-GCM envelope encryption metadata and authorized download URLs.
- **Files Created/Modified:** `migrations/0001_initial_schema.sql`, `migrations/0002_d1_schema.sql`, `wrangler.toml`, `server.ts`.
- **Status:** Completed.

### Step 18 - Three Independent Deployed Surfaces & Clean Routing

- **Date/Time:** 2026-10-15 07:56
- **Objective:** Architect three distinct deployment surfaces: Public SaaS Website, Student Application, and Administrator Dashboard. Provide clean client-side routing with browser URL and history integration, while strictly prohibiting role switching within the student interface.
- **Files Created/Modified:** `src/router.tsx`, `src/App.tsx`, `index.html`, `favicon.svg`.
- **Status:** Completed.

---

## D. Final Implementation Summary

### Features Actually Implemented

1. **Public SaaS Marketing & Billing Portal**:
   - Full public landing page, interactive pricing table with monthly/annual toggle, features showcase, and 4-step student workflow.
   - Idempotent payment webhook processing (`/api/webhooks/payment`) with duplicate event prevention.
   - Successful purchase triggers automated generation of unprovisioned student purchase records awaiting administrator completion.
2. **Administrator Console**:
   - Comprehensive student provisioning interface with full academic profile inputs (GPA, max GPA, degree level, qualifications, intake term, research achievements, target countries, test scores).
   - One-click provisioning from awaiting subscription purchases.
   - Student profile editing, account suspension/activation, and credential reset.
   - Configurable subscription plans allowing administrators to adjust daily and monthly caps.
   - Operational and security audit log inspection.
   - Internal diagnostic unit test runner executing all backend suites.
3. **Strictly Read-Only Student Profile**:
   - Frontend: Removed Save Profile button, converted all academic fields to disabled presentation fields, added administrator-managed notice banner.
   - Backend: Protected `/api/profile` returning HTTP 403 Forbidden with `STUDENT_PROFILE_READ_ONLY` if called by students.
   - Document Vault with file size validation (<20MB), MIME checks, and AES-256-GCM encryption metadata stored in Cloudflare R2 object table.
4. **Country-First Academic Discovery Engine**:
   - ISO-3166-1 sovereign nation selector with real catalog indicators and academic fields taxonomy.
   - Durable discovery jobs tracking crawler stages, pages inspected, and extracted opportunities.
   - Dynamic study-level filters computed strictly from query results (e.g., Master, PhD, Bachelor, MBA).
   - Distinct programme opportunity cards (never collapsed or merged across degree tiers).
   - In-depth Programme Details modal with official portal notifications and verified admissions contacts.
5. **Dedicated Gmail Account Integration**:
   - Dedicated "Gmail Account" tab for students.
   - Connection status inspection, Google OAuth connect/disconnect controls, and deliverability verification test sender.
   - Scopes restricted to least-privilege `gmail.send` and `userinfo.email`.
   - Token encryption at rest using AES-256-GCM.
6. **Prominent "Start Sending" Application Queue**:
   - Prominent Start Sending control in header and Outbox tab.
   - Atomic quota reservation enforcing subscription plan daily sending limits (e.g. 25/day).
   - Safeguards: 60–240s randomized jitter, 08:00–17:00 recipient local timezone window, 7-day follow-up pause, and Do-Not-Contact suppression check.
7. **Frontend Navigation Compliance**:
   - Student sidebar: Daily, Discover, Programmes, Emails, Outbox, Gmail Account, Matches, Profile (Read-Only), Settings.
   - "Site check" completely removed from student view.
   - "Docs & Tests" removed from student navigation and relocated to administrator diagnostics.
8. **SSRF Defenses & Security Isolation**:
   - External crawler and URL validation strictly blocks loopback, cloud metadata (`169.254.169.254`), and private RFC1918 subnets.
   - Server-side RBAC enforces HTTP 403 Forbidden on all administrative endpoints when accessed by students.

### Test Results

- **Full Test Suite (`python3 -m unittest discover tests`)**: 37 / 37 tests PASSED (0 failures, 0 errors, 1.46s).
- **TypeScript Static Verification (`npm run lint` / `tsc --noEmit`)**: 0 errors.
- **AI Studio Applet Build (`compile_applet`)**: Succeeded.

### Verification Matrix

- **RBAC & Read-Only Profile**: Verified with automated tests (test_03, test_05, test_12).
- **Payment Webhook & Idempotency**: Verified with automated test (test_04).
- **SSRF Defense**: Verified with automated test (test_08).
- **Gmail Account Status & Test Ping**: Verified with automated test (test_07).
- **Application Queue & Quota Dispatch**: Verified with automated test (test_06).
- **Discovery Taxonomy & Durable Jobs**: Verified with automated test (test_09).
- **Dynamic Study Level Derivation**: Verified with automated test (test_10).
- **Cloudflare R2 Document Vault Storage**: Verified with automated test (test_11).
- **UI Responsiveness & Navigation**: Verified in React 19 component tree.
