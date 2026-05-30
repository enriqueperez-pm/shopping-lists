-- ============================================================
-- Purchase history — run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_count INT NOT NULL DEFAULT 0,
  note TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_trip_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES purchase_trips(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category_name TEXT,
  qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_trips_date ON purchase_trips (purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_trip_items_trip ON purchase_trip_items (trip_id);

ALTER TABLE purchase_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_trip_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_trips ON purchase_trips;
DROP POLICY IF EXISTS public_write_trips ON purchase_trips;
DROP POLICY IF EXISTS public_read_trip_items ON purchase_trip_items;
DROP POLICY IF EXISTS public_write_trip_items ON purchase_trip_items;

CREATE POLICY "public_read_trips" ON purchase_trips FOR SELECT USING (true);
CREATE POLICY "public_write_trips" ON purchase_trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_trip_items" ON purchase_trip_items FOR SELECT USING (true);
CREATE POLICY "public_write_trip_items" ON purchase_trip_items FOR ALL USING (true) WITH CHECK (true);
