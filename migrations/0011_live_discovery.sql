-- Cloudflare D1 Migration 0011: live discovery. The bulk crawler stores only which subjects each university teaches;
-- programmes are crawled live when a student searches, one page per request, and kept for 30 days.
CREATE TABLE IF NOT EXISTS university_subjects (
    country_code TEXT NOT NULL,
    subject TEXT NOT NULL,
    university_id TEXT NOT NULL,
    rank_sort INTEGER NOT NULL,
    levels TEXT,
    PRIMARY KEY (country_code, subject, university_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS live_crawls (
    university_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL, -- 'running' | 'done' | 'failed'
    claimed_by TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    pages INTEGER DEFAULT 0,
    programs_found INTEGER DEFAULT 0,
    rows_written INTEGER DEFAULT 0,
    last_error TEXT,
    PRIMARY KEY (university_id, subject)
) WITHOUT ROWID;

ALTER TABLE institution_queue ADD COLUMN tags TEXT;
ALTER TABLE crawl_budget ADD COLUMN live_crawls INTEGER DEFAULT 0;

INSERT OR IGNORE INTO university_subjects (country_code, subject, university_id, rank_sort, levels)
SELECT country_code, subject, university_id, MIN(rank_sort), group_concat(DISTINCT level)
FROM program_search GROUP BY country_code, subject, university_id;

INSERT OR IGNORE INTO live_crawls (university_id, subject, status, started_at, finished_at, programs_found)
SELECT s.university_id, s.subject, 'done', q.last_crawled_at, q.last_crawled_at, COUNT(*)
FROM program_search s JOIN institution_queue q ON q.university_id = s.university_id
WHERE q.last_crawled_at IS NOT NULL
GROUP BY s.university_id, s.subject;
