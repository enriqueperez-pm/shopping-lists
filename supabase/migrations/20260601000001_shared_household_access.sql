-- Shared household access: two authenticated users see and manage all data
-- Run in Supabase SQL Editor (project mbjfyuswniyduwygvrhh)
--
-- Primary (shopping data + budget payload): 71aa401e-ad23-4413-b72e-5e17c62bb507
-- Second member:                          6a09dedf-b6bb-45ed-9606-091a66286875

-- products
DROP POLICY IF EXISTS products_select_own ON products;
DROP POLICY IF EXISTS products_insert_own ON products;
DROP POLICY IF EXISTS products_update_own ON products;
DROP POLICY IF EXISTS products_delete_own ON products;

CREATE POLICY products_household_select ON products
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY products_household_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY products_household_update ON products
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ))
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY products_household_delete ON products
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

-- shopping_items
DROP POLICY IF EXISTS shopping_select_own ON shopping_items;
DROP POLICY IF EXISTS shopping_insert_own ON shopping_items;
DROP POLICY IF EXISTS shopping_update_own ON shopping_items;
DROP POLICY IF EXISTS shopping_delete_own ON shopping_items;

CREATE POLICY shopping_household_select ON shopping_items
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY shopping_household_insert ON shopping_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY shopping_household_update ON shopping_items
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ))
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY shopping_household_delete ON shopping_items
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

-- purchase_trips
DROP POLICY IF EXISTS trips_select_own ON purchase_trips;
DROP POLICY IF EXISTS trips_insert_own ON purchase_trips;
DROP POLICY IF EXISTS trips_update_own ON purchase_trips;
DROP POLICY IF EXISTS trips_delete_own ON purchase_trips;

CREATE POLICY trips_household_select ON purchase_trips
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY trips_household_insert ON purchase_trips
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY trips_household_update ON purchase_trips
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ))
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY trips_household_delete ON purchase_trips
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

-- purchase_trip_items
DROP POLICY IF EXISTS trip_items_select_own ON purchase_trip_items;
DROP POLICY IF EXISTS trip_items_insert_own ON purchase_trip_items;
DROP POLICY IF EXISTS trip_items_delete_own ON purchase_trip_items;

CREATE POLICY trip_items_household_select ON purchase_trip_items
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY trip_items_household_insert ON purchase_trip_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY trip_items_household_delete ON purchase_trip_items
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

-- user_financial_payload
DROP POLICY IF EXISTS user_financial_payload_select_own ON user_financial_payload;
DROP POLICY IF EXISTS user_financial_payload_insert_own ON user_financial_payload;
DROP POLICY IF EXISTS user_financial_payload_update_own ON user_financial_payload;
DROP POLICY IF EXISTS user_financial_payload_delete_own ON user_financial_payload;

CREATE POLICY user_financial_payload_household_select ON user_financial_payload
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY user_financial_payload_household_insert ON user_financial_payload
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY user_financial_payload_household_update ON user_financial_payload
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ))
  WITH CHECK (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));

CREATE POLICY user_financial_payload_household_delete ON user_financial_payload
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    '71aa401e-ad23-4413-b72e-5e17c62bb507'::uuid,
    '6a09dedf-b6bb-45ed-9606-091a66286875'::uuid
  ));
