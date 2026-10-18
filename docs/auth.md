# Authentication & User Isolation (`docs/auth.md`)

## Overview
AdmitPath features its own standalone authentication and identity management system. Google OAuth is strictly decoupled from the login flow and only serves as an optional mailbox integration after authentication.

## Security Architecture
1. **Password Hashing**: Passwords are cryptographically hashed using PBKDF2 with SHA-256 (or Argon2 where available) combined with a cryptographically secure random salt (32 bytes) and 100,000 iterations.
2. **Password Policy**:
   - Minimum 8 characters length
   - Must contain at least one letter and one number
3. **Session Management**:
   - Opaque session tokens (32 bytes high-entropy hex string).
   - Sessions stored in SQLite `sessions` table with an expiration timestamp (default 7 days).
   - Cookies configured with `HttpOnly`, `SameSite=Lax`, and `Secure` flags.
4. **Rate Limiting & Lockout**:
   - Failed login attempts are tracked per IP and per account.
   - 5 consecutive failures triggers a 15-minute temporary lockout.
5. **Multi-Tenant User Data Isolation**:
   - All student profiles, uploaded documents, shortlists, drafts, outbox messages, and sent logs are strictly filtered by `user_id`.
   - APIs reject access if the resource owner does not match the active session `user_id`.

## Configuration Keys (`.env`)
- `APP_SECRET`: Secret key used for signing session identifiers and CSRF tokens.
- `SESSION_TTL_HOURS`: Defaults to 168 hours (7 days).

## Verification & Testing
- Unit tests in `tests/test_auth.py` cover:
  - User signup and duplicate email rejection
  - Weak password validation
  - Password hashing and verification
  - Session generation and expiration
  - Multi-user data isolation (User B cannot read User A's drafts or profile)

## Cloudflare Worker auth (current, `worker/`)
This section is the source of truth. The notes above describe the plan; the Express server in `server.ts` did not implement cookies, CSRF or lockout, and it accepted an `x-impersonate-role` header that granted admin access without a password. The Worker does not.

### What was built
- `POST /api/auth/login`: JSON body `{ email, password }`. Email is trimmed and lower-cased. Returns `{ success, csrf_token, user }` and sets two cookies. No token is returned in the body.
- `GET /api/auth/me`: current user, student profile, subscription, settings, Gmail status and `csrf_token`.
- `POST /api/auth/logout`: needs the CSRF header. Deletes the session row and clears both cookies.
- Middleware: `sameOrigin` (blocks unsafe requests whose `Origin` differs), `loadSession`, `requireCsrf`, `requireAuth`, `requireAdmin`.

### How it works
- Passwords: PBKDF2-SHA256, 100,000 iterations, 32-byte output, via WebCrypto. Output matches Node's `pbkdf2Sync`, so existing hashes keep working. Comparison is constant-time, and unknown emails still run a hash so timing does not reveal which emails exist.
- Sessions: 32 random bytes in the `ap_session` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`). Only the SHA-256 of the token is stored in `sessions.token`, so a database leak does not leak live sessions. Expired rows are purged on each successful login.
- CSRF: each session has its own random `csrf_token`, readable from the `ap_csrf` cookie and from login/me responses. POST, PUT, PATCH and DELETE with a session must send it as `X-CSRF-Token`.
- Lockout: 5 failed logins for one email within 15 minutes blocks that email for 15 minutes from the last failure, even with the right password (HTTP 429 with `Retry-After`). A success resets the count. 20 failures from one IP (`CF-Connecting-IP`) in 15 minutes blocks that IP.
- Suspended or deactivated users cannot log in, and existing sessions get 403.
- No Bearer tokens and no impersonation headers are accepted.
- New users: there is no signup page or seeded password. Create accounts with `npm run create-user -- --email you@example.com --name "Your Name" --role admin` (add `--local` for the local D1).

### Config keys (`wrangler.toml` `[vars]`)
`SESSION_TTL_HOURS` (168), `LOGIN_MAX_FAILURES` (5), `LOGIN_LOCKOUT_MINUTES` (15), `LOGIN_IP_MAX_FAILURES` (20), `COOKIE_SECURE` (defaults to true; set "false" only if testing over plain http on a non-localhost host).

### Tests
`npm run test:worker` (`tests/worker/auth.test.ts`, 29 tests): PBKDF2 compatibility, password rules, login success and cookie flags, hashed token storage, case-insensitive email, identical errors for wrong password and unknown email, non-JSON body, suspended accounts, email lockout and recovery, reset on success, per-IP limit, `me` isolation between two users, forged cookie, impersonation header ignored, Bearer rejected, session expiry and TTL config, CSRF missing or from another session, cross-origin block, logout revocation and replay, audit entries, admin vs student access, 404/405 and the ASSETS fallback.

### Known limits
- Students sign up with Google (see below). No email/password signup, forgot/reset password or profile email change.
- The frontend still uses Bearer tokens in `localStorage` and the impersonation header; it moves to cookies in migration stage 2 (`docs/worker-migration.md`).
- Sessions are per host. Signing in on `app.adminpath.com` does not sign you in on `admin.adminpath.com`.

### Unverified
- Not yet run under `wrangler dev` or on the deployed Worker.

## Google sign-in (added 2026-10-18)
The project owner decided students sign up and sign in with Google. This replaces the earlier rule that Google OAuth is never the login method. Gmail sending stays a separate, optional connection (`docs/gmail-oauth.md`).

### How it works
- "Continue with Google" on `/login` goes to `GET /api/auth/google/start`, which redirects to Google with scopes `openid email profile` only. These are non-sensitive, so Google needs no app verification for sign-in.
- PKCE (S256), a random `state` stored hashed in `login_states` (10 minutes, single use), and the same `state` in an HttpOnly `ap_gstate` cookie scoped to `/api/auth/google`. The callback requires both to match, which blocks login CSRF.
- `GET /api/auth/google/callback` exchanges the code, reads the `id_token` (audience must be our client ID, issuer must be Google, email must be verified), then:
  1. finds the user by `users.google_sub`, or
  2. links an existing user with the same email (unless that user is already linked to a different Google account: `google_conflict`), or
  3. creates a student with an empty profile and a settings row.
- Then it creates the normal session cookie and redirects to `/onboarding` (profile not done), `/dashboard`, or `/admin/dashboard`.
- Errors return to `/login?error=` with `google_denied`, `google_expired`, `google_unverified`, `google_conflict`, `google_not_configured`, `google_failed` or `suspended`; the login page shows a plain message.
- Google-created accounts have no password (`password_hash = ''`), so email/password login always fails for them. Email/password stays for admins created with `npm run create-user`.
- Audit log actions: `SIGNUP_GOOGLE`, `LOGIN_GOOGLE`.

### Setup
Add `http://127.0.0.1:8787/api/auth/google/callback` and `https://app.adminpath.com/api/auth/google/callback` to the OAuth client's authorized redirect URIs (next to the Gmail ones). Uses the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; `GMAIL_TOKEN_KEY` is not needed for sign-in.

### Tests
`tests/worker/signup.test.ts`: consent URL, missing config, first sign-in creates a student and goes to onboarding, repeat sign-in reuses the account, linking by email, conflict protection, admin landing, unverified email, wrong audience, login CSRF (state cookie missing), expired state, access denied, suspended account, no password login for Google accounts, PKCE.
