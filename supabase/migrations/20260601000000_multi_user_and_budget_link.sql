-- Multi-user auth + budget link for shopping tables
-- Run manually in Supabase SQL Editor (project mbjfyuswniyduwygvrhh)

-- 1. Add user_id columns (nullable first for backfill)
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE purchase_trips ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE purchase_trip_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Link purchase trips to budget transactions (FinancialDatabase tx id)
ALTER TABLE purchase_trips ADD COLUMN IF NOT EXISTS budget_tx_id TEXT;

-- 3. MANUAL STEP (required before enforcing NOT NULL / new RLS):
--    After creating your Supabase Auth user(s), assign existing rows:
--    UPDATE products SET user_id = '<your-auth-user-uuid>' WHERE user_id IS NULL;
--    UPDATE shopping_items SET user_id = '<your-auth-user-uuid>' WHERE user_id IS NULL;
--    UPDATE purchase_trips SET user_id = '<your-auth-user-uuid>' WHERE user_id IS NULL;
--    UPDATE purchase_trip_items SET user_id = '<your-auth-user-uuid>' WHERE user_id IS NULL;
--    Replace <your-auth-user-uuid> with auth.users.id from Authentication dashboard.

-- 4. Drop legacy public policies
DROP POLICY IF EXISTS public_read_categories ON categories;
DROP POLICY IF EXISTS public_read_products ON products;
DROP POLICY IF EXISTS public_write_products ON products;
DROP POLICY IF EXISTS public_read_shopping ON shopping_items;
DROP POLICY IF EXISTS public_write_shopping ON shopping_items;
DROP POLICY IF EXISTS public_read_trips ON purchase_trips;
DROP POLICY IF EXISTS public_write_trips ON purchase_trips;
DROP POLICY IF EXISTS public_read_trip_items ON purchase_trip_items;
DROP POLICY IF EXISTS public_write_trip_items ON purchase_trip_items;

-- categories remain readable by all authenticated users (shared taxonomy)
DROP POLICY IF EXISTS auth_read_categories ON categories;
CREATE POLICY auth_read_categories ON categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS products_select_own ON products;
DROP POLICY IF EXISTS products_insert_own ON products;
DROP POLICY IF EXISTS products_update_own ON products;
DROP POLICY IF EXISTS products_delete_own ON products;
CREATE POLICY products_select_own ON products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY products_insert_own ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY products_update_own ON products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY products_delete_own ON products FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS shopping_select_own ON shopping_items;
DROP POLICY IF EXISTS shopping_insert_own ON shopping_items;
DROP POLICY IF EXISTS shopping_update_own ON shopping_items;
DROP POLICY IF EXISTS shopping_delete_own ON shopping_items;
CREATE POLICY shopping_select_own ON shopping_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY shopping_insert_own ON shopping_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY shopping_update_own ON shopping_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY shopping_delete_own ON shopping_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trips_select_own ON purchase_trips;
DROP POLICY IF EXISTS trips_insert_own ON purchase_trips;
DROP POLICY IF EXISTS trips_update_own ON purchase_trips;
DROP POLICY IF EXISTS trips_delete_own ON purchase_trips;
CREATE POLICY trips_select_own ON purchase_trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY trips_insert_own ON purchase_trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY trips_update_own ON purchase_trips FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY trips_delete_own ON purchase_trips FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trip_items_select_own ON purchase_trip_items;
DROP POLICY IF EXISTS trip_items_insert_own ON purchase_trip_items;
DROP POLICY IF EXISTS trip_items_delete_own ON purchase_trip_items;
CREATE POLICY trip_items_select_own ON purchase_trip_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY trip_items_insert_own ON purchase_trip_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY trip_items_delete_own ON purchase_trip_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS products_user_id_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS shopping_items_user_id_idx ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS purchase_trips_user_id_idx ON purchase_trips(user_id);
