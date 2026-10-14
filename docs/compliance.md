# Compliance, Suppression & Privacy (`docs/compliance.md`)

## Global & Per-User Suppression Lists
- **Opt-Out Phrase Detection**: Any reply containing words like "stop", "unsubscribe", or "do not contact" is immediately parsed, and the sender is added to the suppression list.
- **Suppression Enforcement**:
  - Global suppression: Applies across all students on the platform (e.g. university official requests to be excluded).
  - Per-user suppression: Specific contacts excluded for that individual student.
  - The email composer and outbox queue strictly block message dispatch to any suppressed address.

## Regulatory Frameworks
- **GDPR & PECR (EU / UK)**: Legitimate interest justification for individual B2B/academic inquiries; strict honoring of right to object and right to be forgotten.
- **CASL (Canada)**: Clear sender identification, physical/contact details, and functioning one-click/reply opt-out mechanism.
- **CAN-SPAM (USA)**: Accurate header information, non-deceptive subject lines, physical sender address disclosure, and mandatory opt-out instructions.

## Data Subject Rights
- **Data Export**: Students can download all their data (profile, shortlists, drafts, sent logs) as a structured JSON file at any time.
- **Account Deletion**: Complete deletion of all personal data, documents, and credentials upon student request.
