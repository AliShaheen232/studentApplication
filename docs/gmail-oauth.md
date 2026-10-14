# Google OAuth & Gmail Integration (`docs/gmail-oauth.md`)

## Overview
Students can optionally connect their personal Gmail account via Google OAuth 2.0 to send verified, highly personalized admissions inquiries directly from their own mailbox.

## Scopes
- `https://www.googleapis.com/auth/gmail.send`: Allows AdmitPath to send approved drafts via the Gmail REST API (using MIME multipart messages with clean HTML and plain text).
- `https://www.googleapis.com/auth/gmail.readonly`: Allows AdmitPath to inspect the user's thread to detect direct replies and incoming automated delivery failures (NDR / bounce detection).

## Security & Storage
- Refresh tokens are encrypted at rest using AES-256-GCM before being stored in the database.
- Tokens are automatically refreshed when expired.
- One-click disconnect immediately revokes the token and purges the encrypted record from the database.
- If access is revoked externally by the student in their Google Account security panel, AdmitPath flags the connection with a descriptive "Reconnect required" alert and suspends pending outbox sends.

## Mandatory Self-Test Gate
- Before any outbox drafts can be delivered to university contacts, the student must send a self-test email to their own connected Gmail address and confirm receipt.
- This ensures deliverability and verifies mailbox authorization.

## Verification & Testing
- Unit tests in `tests/test_gmail_mime.py` test MIME multipart structure, headers, plain text fallback, HTML rendering, and file attachments without external API calls.
