-- Cloudflare D1 Migration 0013: full academic history as a JSON list
ALTER TABLE students ADD COLUMN education_history TEXT;
