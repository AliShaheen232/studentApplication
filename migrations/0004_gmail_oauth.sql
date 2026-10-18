-- Cloudflare D1 Migration 0004: real Google OAuth for Gmail sending
CREATE TABLE IF NOT EXISTS oauth_states (
    state_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);

ALTER TABLE gmail_tokens ADD COLUMN last_error TEXT;

-- Rows written by the old demo server hold fake tokens, never issued by Google.
DELETE FROM gmail_tokens;
UPDATE settings SET gmail_connected = 0, gmail_email = NULL, last_test_sent_at = NULL;
