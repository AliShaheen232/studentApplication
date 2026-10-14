# AdmitPath - Global University Admissions & Outreach Engine

AdmitPath is a full-stack platform that helps students discover universities and academic programs worldwide, extract verified public admissions contacts, and draft compliant, personalized outreach inquiries from their own Gmail account.

## Core Features & Architecture

1. **Worldwide University Directory**:
   - Seeded from open datasets across 16 countries: USA, Canada, UK, Germany, Netherlands, France, Italy, Spain, Sweden, Finland, Ireland, Australia, South Korea, Indonesia, Malaysia, and South Africa.
   - Comprehensive program details, tuition ranges, language requirements, and application deadlines.
2. **Polite Web Crawler & Public Contact Finder**:
   - Respects `robots.txt` Disallow directives.
   - Throttles per-domain concurrency (1-2) with polite random delay backoff.
   - Categorizes public emails into `role` (e.g. `admissions@`, `gradschool@`) versus `personal` faculty contacts.
   - Strict compliance: never probes mail servers, never guesses email patterns, never scrapes behind authentication.
3. **Student Profile & Admissions Matcher**:
   - Detailed academic profile (GPA, nationality, target degree level, subject interests, budget, English proficiency scores, research experience).
   - Multi-factor algorithm scoring program compatibility (0-100%) with transparent decision reasons and factor breakdowns.
4. **Document Vault**:
   - Stores CVs, transcripts, degree certificates, and motivation letters.
   - Enforces a 20 MB size limit per email package and validates MIME types.
5. **Personalized Email Composer & Review Workflow**:
   - Generates personalized drafts combining student background + university curriculum + custom faculty/lab hooks.
   - Multiple template variants: Admissions Inquiry, Research / Lab Fit, and Scholarship / Funding.
   - Generates RFC 2822 dual-part MIME messages (accessible HTML + plain-text fallback).
   - Enforces mandatory student sender signature and anti-spam opt-out footer (*"Reply 'stop' and I will not write again"*).
   - Mandatory human approval gate before queuing.
6. **Deliverability Protection & Timezone Windows**:
   - Warm-up ramp schedule: 20 -> 30 -> 40 emails/day max.
   - Random delivery gaps of 60 to 240 seconds to prevent burst spam detection.
   - Recipient local timezone window enforcement: sends exclusively between 08:00 and 17:00 recipient business hours.
   - 7-day minimum follow-up spacing constraint per university recipient.
   - Automated pause circuit breaker if the bounce/NDR rate exceeds 5.0%.
7. **Compliance & Privacy**:
   - Permanent global and per-student Do-Not-Contact suppression list.
   - Automatic opt-out detection from replies containing "stop" or "unsubscribe".
   - Full GDPR Article 15 Data Subject Access Request export (JSON).
   - GDPR Article 17 Right to Erasure ("Right to be Forgotten") one-click account deletion.
   - Disclosures covering GDPR/PECR, CASL, and CAN-SPAM.

## Running the Application

### Dev Server (Vite + Express on Port 3000)
```bash
npm run dev
```

### Python Core CLI & WSGI Server
```bash
python3 app.py
```

### Running the Test Suite
```bash
python3 -m unittest discover tests
```
Or view the live test runner inside the **Docs & Unit Tests** tab of the UI.
