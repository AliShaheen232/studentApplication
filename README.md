# AdminPath - Global University Admissions & Outreach SaaS Platform

AdminPath is a production-oriented, subscription-based SaaS platform through which administrators manage individual student accounts, discover worldwide university programmes, generate curriculum-tailored AI application inquiries, and send deliverability-protected emails directly through each student's personal Gmail account.

---

## 1. Product Vision & Architecture

- **Multi-Role RBAC:**
  - **Administrator (`admin`)**: Responsible for student account provisioning, configuring verified academic records (GPA, degree qualifications, research achievements, target countries), assigning subscription tiers, monitoring queue dispatch health, adjusting sending caps, and reviewing immutable audit logs.
  - **Student (`student`)**: Accesses an authenticated portal with a strictly **read-only** profile (modifications blocked both on frontend and via backend 403 enforcement), discovers global universities and programmes across all disciplines, reviews AI-crafted application drafts, connects their personal Gmail account via OAuth 2.0, and executes queue sending via the prominent **Start Sending** control.
- **Public Website & Subscription Billing:**
  - Includes Landing Page, Features, 4-Step Workflow, Interactive Pricing (Monthly & Annual intervals), Terms of Service, Privacy Policy (GDPR/CASL), and Support.
  - Configurable subscription plans: _Starter Scholar_ ($29/mo, 10/day cap), _Scholar Pro_ ($69/mo, 25/day cap), and _Global Fellow_ ($149/mo, 40/day cap).
  - Idempotent payment webhook processing (`/api/webhooks/payment`) with duplicate event prevention. Confirmed purchases generate unprovisioned records awaiting administrator review.
- **Dedicated Gmail Account Integration:**
  - Dedicated "Gmail Account" tab for students to connect, inspect authorization health, send verification test emails, and disconnect.
  - Uses least-privilege `gmail.send` and `userinfo.email` scopes.
  - OAuth tokens are encrypted at rest with AES-256-GCM.
- **Atomic Quota Enforcement & Safeguards:**
  - "Start Sending" batch execution endpoint (`/api/queue/start-sending`) enforces daily and monthly subscription quotas atomically.
  - Enforces 60–240s randomized delivery intervals, recipient local timezone window constraints (08:00–17:00), 7-day follow-up spacing, bounce circuit breaker (>5.0%), and permanent Do-Not-Contact suppression lists.
- **SSRF Defense:**
  - Polite catalog crawler validates destination URLs and strictly blocks cloud metadata (`169.254.169.254`), loopback (`127.0.0.1`), and private RFC1918 subnets (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`).

---

## 2. Setup & Local Development

### Prerequisites

- Node.js 22.x
- Python 3.10+ (for Python core utilities & legacy test suite)
- npm

### Installation

```bash
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

### Running the Application

Start the unified full-stack development server on port 3000:

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

---

## 3. Seed Accounts for Testing

| Role              | Email                   | Password           | Entitlements                        |
| ----------------- | ----------------------- | ------------------ | ----------------------------------- |
| **Administrator** | `admin@admitpath.app`   | `AdminMaster2026!` | Full provisioning & system controls |
| **Demo Student**  | `scholar@admitpath.app` | `ScholarPass2026`  | Scholar Pro plan (25 emails/day)    |

_(An interactive role switcher pill is also provided in the top header for instant one-click preview testing.)_

---

## 4. Automated Testing

### Run All Unit & SaaS Integration Tests

```bash
# Run complete test suite (33 passing tests)
python3 -m unittest discover tests

# Or run SaaS feature suite directly:
python3 -m unittest tests/test_saas_features.py
```

### Type Checking & Linting

```bash
npm run lint
```

---

## 5. Required Development Documentation

Full development history, architectural decisions, and step-by-step audit logs are continuously recorded in:

- `AdminPath_SaaS_Development_Log.md`
