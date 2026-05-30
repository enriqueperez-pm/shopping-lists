-- ============================================================
-- Migracion incremental: 3 estados en shopping_items
-- ============================================================

BEGIN;

ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needed';

ALTER TABLE shopping_items
  DROP CONSTRAINT IF EXISTS shopping_items_status_check;

ALTER TABLE shopping_items
  ADD CONSTRAINT shopping_items_status_check
  CHECK (status IN ('needed', 'in_cart', 'purchased'));

UPDATE shopping_items
SET status = CASE WHEN checked THEN 'purchased' ELSE 'needed' END
WHERE status IS NULL OR status NOT IN ('needed', 'in_cart', 'purchased');

COMMIT;
