-- Cloudflare D1 Migration 0003: Worker auth (hashed session tokens, CSRF, lockout lookups)
-- Sessions created by the old Express server stored raw tokens; they cannot be used by the Worker.
DELETE FROM sessions;

ALTER TABLE sessions ADD COLUMN csrf_token TEXT;
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ident_time ON login_attempts(identifier, attempt_time);
