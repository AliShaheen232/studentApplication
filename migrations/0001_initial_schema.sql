-- Cloudflare D1 Initial Schema Migration 0001
-- AdminPath Multi-Tenant SaaS Architecture

-- 1. Identity & Role-Based Access Control
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'student', -- 'student' | 'admin'
    status TEXT DEFAULT 'active', -- 'active' | 'suspended' | 'deactivated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 2. Subscriptions, Plans & Billing
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_usd REAL NOT NULL,
    billing_interval TEXT DEFAULT 'monthly',
    daily_send_limit INTEGER DEFAULT 20,
    monthly_send_limit INTEGER DEFAULT 300,
    univ_discovery_limit INTEGER DEFAULT 100,
    prog_discovery_limit INTEGER DEFAULT 250,
    email_gen_limit INTEGER DEFAULT 100,
    max_gmail_accounts INTEGER DEFAULT 1,
    features_json TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    plan_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    status TEXT DEFAULT 'active', -- 'active' | 'awaiting_provisioning' | 'cancelled' | 'past_due'
    payment_provider TEXT DEFAULT 'stripe',
    provider_subscription_id TEXT,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(plan_id) REFERENCES subscription_plans(id),
    FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    subscription_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    provider_payment_id TEXT UNIQUE,
    status TEXT DEFAULT 'succeeded',
    customer_email TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    emails_sent INTEGER DEFAULT 0,
    discovery_searches INTEGER DEFAULT 0,
    ai_generations INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Institutions & Programme Opportunities
CREATE TABLE IF NOT EXISTS universities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT DEFAULT 'US',
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
    source_type TEXT DEFAULT 'official_catalogue',
    last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL, -- Normalized: 'Bachelor', 'Master', 'PhD', 'MBA', 'Diploma'
    original_degree TEXT, -- e.g. 'M.Sc.', 'B.S.', 'Ph.D.'
    department TEXT,
    language TEXT DEFAULT 'English',
    duration_months INTEGER DEFAULT 24,
    tuition REAL,
    deadline TEXT,
    requirements TEXT,
    program_url TEXT,
    admissions_url TEXT,
    subject_category TEXT,
    application_mode TEXT DEFAULT 'portal_and_email', -- 'portal_only' | 'portal_and_email' | 'direct_email'
    source_url TEXT,
    source_type TEXT DEFAULT 'official_website',
    last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- 4. Student Profiles (Admin-Managed Only) & R2 Document Storage Metadata
CREATE TABLE IF NOT EXISTS students (
    user_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    nationality TEXT DEFAULT 'International',
    country_of_residence TEXT DEFAULT 'International',
    gpa REAL DEFAULT 3.8,
    max_gpa REAL DEFAULT 4.0,
    qualification TEXT DEFAULT 'Bachelor of Science',
    target_level TEXT DEFAULT 'Master',
    intake_term TEXT DEFAULT 'Fall 2026',
    subjects TEXT DEFAULT 'Computer Science, Data Science & AI',
    countries TEXT DEFAULT 'USA, United Kingdom, Germany, Canada',
    preferred_universities TEXT DEFAULT 'MIT, Stanford, Oxford, TU Munich',
    budget_max REAL DEFAULT 50000,
    currency TEXT DEFAULT 'USD',
    ielts_score REAL DEFAULT 7.5,
    toefl_score REAL DEFAULT 105,
    experience TEXT,
    academic_achievements TEXT,
    additional_preferences TEXT,
    status TEXT DEFAULT 'active',
    activation_token TEXT,
    is_provisioned INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- 'CV', 'Transcript', 'Degree Certificate', 'Statement of Purpose'
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    r2_key TEXT,
    storage_provider TEXT DEFAULT 'r2',
    encrypted_blob_meta TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Outreach, Gmail, Outbox & Suppression
CREATE TABLE IF NOT EXISTS gmail_tokens (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    encrypted_access_token TEXT,
    token_expires_at TIMESTAMP,
    scopes TEXT,
    status TEXT DEFAULT 'connected',
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    template_key TEXT DEFAULT 'academic_inquiry',
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT NOT NULL,
    attachments TEXT,
    hook TEXT,
    status TEXT DEFAULT 'draft', -- 'draft' | 'needs_review' | 'approved'
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
    status TEXT DEFAULT 'pending', -- 'pending' | 'sending' | 'sent' | 'failed'
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

CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    daily_cap INTEGER DEFAULT 25,
    ramp_stage INTEGER DEFAULT 1,
    send_window_start INTEGER DEFAULT 8,
    send_window_end INTEGER DEFAULT 17,
    min_gap_sec INTEGER DEFAULT 60,
    max_gap_sec INTEGER DEFAULT 240,
    gmail_connected INTEGER DEFAULT 0,
    gmail_email TEXT,
    last_test_sent_at TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_univ_country ON universities(country);
CREATE INDEX IF NOT EXISTS idx_univ_domain ON universities(domain);
CREATE INDEX IF NOT EXISTS idx_prog_subject ON programs(subject_category);
CREATE INDEX IF NOT EXISTS idx_prog_level ON programs(level);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression(email);
CREATE INDEX IF NOT EXISTS idx_outbox_user_status ON outbox(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_student ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_ledger(user_id, date);
