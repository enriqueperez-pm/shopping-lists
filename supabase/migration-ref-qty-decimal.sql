-- Migration: allow decimal ref_qty on products (0.1 – 99)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_ref_qty_check;

ALTER TABLE products
  ALTER COLUMN ref_qty TYPE NUMERIC(10,3) USING ref_qty::numeric,
  ALTER COLUMN ref_qty SET DEFAULT 1;

ALTER TABLE products
  ADD CONSTRAINT products_ref_qty_check
  CHECK (ref_qty >= 0.1 AND ref_qty <= 99);
