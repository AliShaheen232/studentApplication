-- Cloudflare D1 Migration 0014: work experience per field as a JSON list
ALTER TABLE students ADD COLUMN work_history TEXT;
