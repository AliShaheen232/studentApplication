-- Cloudflare D1 Migration 0002: Durable Discovery Jobs, Crawler Provenance & R2 Storage
CREATE TABLE IF NOT EXISTS discovery_jobs (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT,
    field TEXT NOT NULL,
    parameters_json TEXT,
    status TEXT DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled'
    current_stage TEXT DEFAULT 'queued',
    institutions_discovered INTEGER DEFAULT 0,
    programmes_extracted INTEGER DEFAULT 0,
    pages_inspected INTEGER DEFAULT 0,
    errors_json TEXT,
    warnings_json TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disc_student_status ON discovery_jobs(student_id, status);
CREATE INDEX IF NOT EXISTS idx_disc_country_field ON discovery_jobs(country, field);

-- R2 Storage Object Ledger
CREATE TABLE IF NOT EXISTS r2_storage_objects (
    id TEXT PRIMARY KEY,
    document_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    bucket_name TEXT DEFAULT 'adminpath-student-documents',
    r2_key TEXT UNIQUE NOT NULL,
    etag TEXT,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    is_encrypted INTEGER DEFAULT 1,
    encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_r2_user ON r2_storage_objects(user_id);
