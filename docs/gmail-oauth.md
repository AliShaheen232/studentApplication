# Google OAuth & Gmail Integration (`docs/gmail-oauth.md`)

## Overview
Students can optionally connect their personal Gmail account via Google OAuth 2.0 to send verified, highly personalized admissions inquiries directly from their own mailbox.

## Scopes
- `https://www.googleapis.com/auth/gmail.send`: Allows AdmitPath to send approved drafts via the Gmail REST API (using MIME multipart messages with clean HTML and plain text).
- `gmail.readonly` is not requested. It is a restricted scope, and Google requires a paid yearly security assessment before restricted scopes can be used publicly. Replies and bounces arrive in the student's own Gmail; opt-outs are added to the suppression list by hand.

## Security & Storage
- Refresh tokens are encrypted at rest using AES-256-GCM before being stored in the database.
- Tokens are automatically refreshed when expired.
- One-click disconnect immediately revokes the token and purges the encrypted record from the database.
- If access is revoked externally by the student in their Google Account security panel, AdmitPath flags the connection with a descriptive "Reconnect required" alert and suspends pending outbox sends.

## Mandatory Self-Test Gate
- Before any outbox drafts can be delivered to university contacts, the student must send a self-test email to their own connected Gmail address and confirm receipt.
- This ensures deliverability and verifies mailbox authorization.

## Verification & Testing
- Worker tests: `tests/worker/gmail.test.ts` (see the Worker section below). The old `tests/test_gmail_mime.py` covers the Python mailer only.

## Cloudflare Worker implementation (current, `worker/`)
The old Express `/api/gmail/connect` never contacted Google; it stored random fake tokens. The Worker replaces it with real OAuth. Migration `0004_gmail_oauth.sql` deletes those fake rows.

### What was built
- `GET /api/gmail/status`: `configured`, `connected`, `needs_reconnect`, `email`, `scopes`, `connected_since`, `last_test_sent_at`, `test_passed`, `last_error`, `status_label`.
- `POST /api/gmail/connect`: returns `{ url }` for Google's consent screen. The frontend redirects there.
- `GET /api/gmail/callback`: Google sends the student back here. Redirects to `/gmail?gmail=<result>` (`connected`, `denied`, `missing_scope`, `unverified_email`, `expired`, `login_required`, `not_configured`, `no_refresh_token`, `error`).
- `POST /api/gmail/disconnect`: revokes the token at Google, deletes it, resets the test gate.
- `POST /api/gmail/test`: sends one email to the connected address and records `settings.last_test_sent_at`.
- `sendAsStudent()` in `worker/lib/gmailAccount.ts`: the function the outbox will use to send university emails (stage 5).

### Files
`worker/routes/gmail.ts`, `worker/lib/google.ts` (OAuth and Gmail API calls), `worker/lib/gmailAccount.ts` (token refresh, reconnect handling, sending), `worker/lib/mime.ts` (MIME builder), `worker/lib/vault.ts` (AES-256-GCM), `migrations/0004_gmail_oauth.sql`, `src/components/GmailTab.tsx`, `src/csrf.ts`.

### How it works
- Scopes: `openid email https://www.googleapis.com/auth/gmail.send`. `access_type=offline` and `prompt=consent` so Google returns a refresh token. PKCE (S256) plus a random `state` that is stored hashed, tied to the logged-in user, single use and valid for 10 minutes.
- The connected address comes from Google's `id_token` and must be verified. The student cannot type an address.
- If the student unticks the send permission on Google's screen, the grant is revoked and nothing is stored.
- Refresh and access tokens are encrypted with AES-256-GCM using `GMAIL_TOKEN_KEY` before they reach D1. Access tokens are cached until one minute before expiry, then refreshed.
- `invalid_grant` on refresh, or a 401 from Gmail, marks the account `reconnect_required`; the UI shows "Reconnect Gmail".
- Connecting a new account revokes the old refresh token and resets the test gate. University sending must check `test_passed` (stage 5).
- MIME: `multipart/alternative` with plain text and HTML, UTF-8 subjects encoded per RFC 2047, line breaks in headers rejected, plain text escaped before it becomes HTML.

### Google Cloud Console setup
1. Go to console.cloud.google.com and create a project (for example "AdmitPath").
2. APIs & Services > Library: enable **Gmail API**.
3. Google Auth Platform (or OAuth consent screen): app name, support email, audience **External**. Leave it in **Testing**.
4. Audience > Test users: add every Gmail address that will connect (your own first).
5. Data access: add the scopes `.../auth/gmail.send`, `openid` and `.../auth/userinfo.email`.
6. Clients > Create client > **Web application**. Authorized redirect URIs:
   - `http://127.0.0.1:8787/api/gmail/callback` (local `wrangler dev`)
   - `https://app.adminpath.com/api/gmail/callback` (production)
7. Copy the client ID into `GOOGLE_CLIENT_ID` in `wrangler.toml` `[vars]`. Keep the client secret out of the repo.

### Secrets
- Generate the encryption key once: `npm run gen:gmail-key`. Keep it safe. If it changes, every connected student must reconnect.
- Deployed Worker: `npx wrangler secret put GOOGLE_CLIENT_SECRET` and `npx wrangler secret put GMAIL_TOKEN_KEY`.
- `wrangler dev`: Wrangler reads local secrets only from a `.dev.vars` file in the project root (git-ignored), with `GOOGLE_CLIENT_SECRET=...` and `GMAIL_TOKEN_KEY=...`. Use the same key as production, because dev uses the production D1.
- Optional `GOOGLE_REDIRECT_URI` overrides the callback URL; by default it is `<request origin>/api/gmail/callback`.

### Testing-mode limits

- At most 100 test users, and only addresses listed as test users can connect.
- Google shows "Google hasn't verified this app"; testers click Advanced, then continue.
- In Testing mode Google expires refresh tokens after 7 days, so students must reconnect weekly until the app is published.
- Publishing with `gmail.send` (a sensitive scope) needs Google's free verification: a privacy policy and homepage on a verified domain, and a short demo video of the consent flow. No paid assessment is needed because no restricted scope is used.
- Gmail's own sending limits still apply (about 500 recipients a day for a personal account); AdmitPath's daily cap stays far below that.

### Config keys
`GOOGLE_CLIENT_ID` (`[vars]`), `GOOGLE_CLIENT_SECRET` (secret), `GMAIL_TOKEN_KEY` (secret, 32 bytes base64), `GOOGLE_REDIRECT_URI` (optional var).

### Tests
`tests/worker/gmail.test.ts` (26 tests, Google mocked): encryption round trip and key checks, MIME structure, UTF-8 subject, header injection, HTML escaping, status, 503 without config, CSRF on connect, consent URL parameters and PKCE, encrypted storage and verified email, single-use and per-user and expiring state, login required, access denied, missing scope revoked, unverified email, test email through the Gmail API, token refresh, revoked grant to reconnect, rate limit 429, test before connect, disconnect revokes, isolation between students, reconnect resets the test gate.

### Known limits
- No reply, bounce or opt-out detection (no `gmail.readonly`).
- No attachments yet; documents on R2 come in stage 4.
- University sending (queue, caps, ramp-up, windows) is stage 5; only the test email sends today.

### Unverified
- Not run against real Google yet. Needs your OAuth client and secrets, then a manual connect, test email and disconnect.
