-- Duplicate indexes cost extra D1 rows_written on every university write.
DROP INDEX IF EXISTS idx_univ_country_name;
DROP INDEX IF EXISTS idx_univ_domain;
