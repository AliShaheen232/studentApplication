-- Cloudflare D1 Migration 0008: bulk catalogue of all institutions in the target countries
CREATE TABLE IF NOT EXISTS crawl_countries (
    country_code TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    institutions_total INTEGER DEFAULT 0,
    imported_at TIMESTAMP,
    changed_at TIMESTAMP,
    snapshot_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institution_queue (
    domain TEXT PRIMARY KEY,
    university_id TEXT NOT NULL,
    qid TEXT,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    website TEXT NOT NULL,
    students INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'done' | 'failed'
    claimed_at TIMESTAMP,
    last_crawled_at TIMESTAMP,
    next_crawl_at TIMESTAMP,
    programs_found INTEGER DEFAULT 0,
    pages INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_iq_status_next ON institution_queue(status, next_crawl_at);
CREATE INDEX IF NOT EXISTS idx_iq_country ON institution_queue(country_code, status);

CREATE TABLE IF NOT EXISTS crawl_budget (
    day TEXT PRIMARY KEY,
    rows_written INTEGER DEFAULT 0
);

ALTER TABLE programs ADD COLUMN removed_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_prog_university ON programs(university_id);
CREATE INDEX IF NOT EXISTS idx_univ_country_name ON universities(country);
