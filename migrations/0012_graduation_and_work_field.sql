-- Cloudflare D1 Migration 0012: graduation month and field of work experience
ALTER TABLE students ADD COLUMN graduation_month INTEGER;
ALTER TABLE students ADD COLUMN work_field TEXT;
