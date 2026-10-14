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
