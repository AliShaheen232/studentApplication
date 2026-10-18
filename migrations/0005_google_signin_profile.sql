-- Cloudflare D1 Migration 0005: Google sign-in and self-service student profile
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS login_states (
    state_hash TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_states_expires ON login_states(expires_at);

ALTER TABLE students ADD COLUMN linkedin_url TEXT;
ALTER TABLE students ADD COLUMN current_degree_level TEXT;
ALTER TABLE students ADD COLUMN field_of_study TEXT;
ALTER TABLE students ADD COLUMN current_institution TEXT;
ALTER TABLE students ADD COLUMN graduation_year INTEGER;
ALTER TABLE students ADD COLUMN funding TEXT;
ALTER TABLE students ADD COLUMN english_test TEXT;
ALTER TABLE students ADD COLUMN pte_score REAL;
ALTER TABLE students ADD COLUMN duolingo_score INTEGER;
ALTER TABLE students ADD COLUMN german_level TEXT;
ALTER TABLE students ADD COLUMN work_experience_years REAL;
ALTER TABLE students ADD COLUMN research_interests TEXT;
ALTER TABLE students ADD COLUMN onboarding_completed_at TIMESTAMP;
