"""AdmitPath Database Module.
Uses SQLite in WAL mode with full foreign key constraints and robust indexing.
"""
import sqlite3
import os
from .config import DB_PATH

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'student',
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS universities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    website TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    ranking INTEGER,
    languages TEXT DEFAULT 'English',
    tuition_min REAL,
    tuition_max REAL,
    currency TEXT DEFAULT 'USD',
    intake_months TEXT DEFAULT 'September',
    source_url TEXT,
    last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    department TEXT,
    language TEXT DEFAULT 'English',
    duration_months INTEGER DEFAULT 24,
    tuition REAL,
    deadline TEXT,
    requirements TEXT,
    program_url TEXT,
    subject_category TEXT,
    FOREIGN KEY(university_id) REFERENCES universities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL,
    department TEXT,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT NOT NULL,
    email_type TEXT DEFAULT 'role',
    phone TEXT,
    source_url TEXT NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(university_id) REFERENCES universities(id) ON DELETE CASCADE,
    UNIQUE(university_id, email)
);

CREATE TABLE IF NOT EXISTS students (
    user_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    nationality TEXT,
    gpa REAL,
    max_gpa REAL DEFAULT 4.0,
    target_level TEXT,
    subjects TEXT,
    countries TEXT,
    budget_max REAL,
    currency TEXT DEFAULT 'USD',
    ielts_score REAL,
    toefl_score REAL,
    experience TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    encrypted_blob_meta TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shortlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    university_id TEXT NOT NULL,
    program_id TEXT,
    contact_id TEXT,
    status TEXT DEFAULT 'shortlisted',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, university_id, program_id)
);

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    program_id TEXT,
    contact_id TEXT,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT NOT NULL,
    attachments TEXT,
    hook TEXT,
    status TEXT DEFAULT 'draft',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    draft_id TEXT,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_tz TEXT DEFAULT 'UTC',
    scheduled_for TIMESTAMP,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sent_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    university_id TEXT,
    subject TEXT NOT NULL,
    message_id TEXT,
    thread_id TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'delivered',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sent_log_id TEXT,
    message_id TEXT,
    from_email TEXT NOT NULL,
    snippet TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_bounce INTEGER DEFAULT 0,
    is_optout INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suppression (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT NOT NULL,
    reason TEXT DEFAULT 'opt_out',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    target_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    pages_crawled INTEGER DEFAULT 0,
    items_found INTEGER DEFAULT 0,
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    daily_cap INTEGER DEFAULT 40,
    ramp_stage INTEGER DEFAULT 0,
    send_window_start INTEGER DEFAULT 8,
    send_window_end INTEGER DEFAULT 17,
    min_gap_sec INTEGER DEFAULT 60,
    max_gap_sec INTEGER DEFAULT 240,
    gmail_connected INTEGER DEFAULT 0,
    gmail_email TEXT,
    last_test_sent_at TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_univ_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_univ_domain ON universities(domain);
CREATE INDEX IF NOT EXISTS idx_prog_subject ON programs(subject_category);
CREATE INDEX IF NOT EXISTS idx_prog_level ON programs(level);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression(email);
CREATE INDEX IF NOT EXISTS idx_outbox_user ON outbox(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sent_user_recip ON sent_log(user_id, recipient_email);
"""

def get_connection(db_path=None):
    """Returns a connection to the SQLite database with WAL enabled."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db(db_path=None):
    """Initializes the database schema."""
    conn = get_connection(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("AdmitPath database initialized successfully in WAL mode.")
