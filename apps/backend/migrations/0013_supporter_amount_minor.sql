-- =============================================================
-- 0013_supporter_amount_minor.sql — integer minor-currency amounts
-- Tables: supporter
--
-- Migrates the free-form `amount` (numeric) column to an integer
-- with an explicit ISO 4217 `currency` so the unit is unambiguous:
--   kofi ↔ USD cents      (amount × 100 → cents)
--   trakteer ↔ IDR rupiah (amount × 1  → whole rupiah)
-- =============================================================

-- 1. New columns (nullable during backfill).
ALTER TABLE supporter ADD COLUMN amount_minor bigint;
ALTER TABLE supporter ADD COLUMN currency text NOT NULL DEFAULT 'USD';

-- 2. Backfill from the legacy `amount` column.
--    kofi amounts are in USD dollars; trakteer in whole IDR rupiah.
UPDATE supporter
SET amount_minor = CASE
        WHEN platform = 'kofi'     THEN ROUND(COALESCE(amount, 0) * 100)::bigint
        WHEN platform = 'trakteer' THEN ROUND(COALESCE(amount, 0))::bigint
        ELSE 0
    END,
    currency = CASE
        WHEN platform = 'kofi'     THEN 'USD'
        WHEN platform = 'trakteer' THEN 'IDR'
        ELSE 'USD'
    END;

-- 3. Drop the legacy column now that the data is migrated.
ALTER TABLE supporter DROP COLUMN amount;