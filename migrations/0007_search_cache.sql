-- Cloudflare D1 Migration 0007: cached discovery searches, filled by the GitHub Actions crawler
CREATE TABLE IF NOT EXISTS search_cache (
    search_key TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    field TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'ready' | 'failed'
    results_json TEXT,
    institutions_count INTEGER DEFAULT 0,
    programs_count INTEGER DEFAULT 0,
    pages_inspected INTEGER DEFAULT 0,
    requested_at TIMESTAMP,
    requested_by TEXT,
    claimed_at TIMESTAMP,
    fetched_at TIMESTAMP,
    expires_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_search_cache_status ON search_cache(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_requester ON search_cache(requested_by, requested_at);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities(country_code);
