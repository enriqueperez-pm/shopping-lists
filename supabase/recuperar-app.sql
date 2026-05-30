-- ============================================================
-- RECUPERACION TOTAL (idempotente)
-- Deja la app lista con catalogo completo de lista-chedraui-pendiente
-- ============================================================

BEGIN;

-- Requisito para UUID en products.id
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Categorias
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO categories (name, sort_order) VALUES
  ('Agua y bebidas', 1),
  ('Despensa seca', 2),
  ('Café, dulce y aderezos', 3),
  ('Conservas', 4),
  ('Aves', 5),
  ('Frutas y verduras', 6),
  ('Salchichonería', 7),
  ('Lácteos refrigerados', 8),
  ('Congelados', 9),
  ('Aseo hogar', 10),
  ('Higiene y farmacia', 11),
  ('Otros', 12)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- Productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  ref_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pz',
  ref_qty INT NOT NULL DEFAULT 1 CHECK (ref_qty BETWEEN 1 AND 99),
  in_stock BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lista de compras
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'needed',
  checked BOOLEAN NOT NULL DEFAULT false,
  weight_grams NUMERIC(10,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

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

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shopping_updated ON shopping_items;
CREATE TRIGGER trg_shopping_updated
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS y policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_categories ON categories;
DROP POLICY IF EXISTS public_read_products ON products;
DROP POLICY IF EXISTS public_write_products ON products;
DROP POLICY IF EXISTS public_read_shopping ON shopping_items;
DROP POLICY IF EXISTS public_write_shopping ON shopping_items;

CREATE POLICY public_read_categories ON categories FOR SELECT USING (true);
CREATE POLICY public_read_products ON products FOR SELECT USING (true);
CREATE POLICY public_write_products ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY public_read_shopping ON shopping_items FOR SELECT USING (true);
CREATE POLICY public_write_shopping ON shopping_items FOR ALL USING (true) WITH CHECK (true);

-- Reset de datos (para que quede espejo del HTML)
DELETE FROM shopping_items;
DELETE FROM products;

INSERT INTO products (name, category_id, ref_price, unit, ref_qty, in_stock) VALUES
  ('Agua Ciel garrafón 10 L',                 (SELECT id FROM categories WHERE name='Agua y bebidas'), 44.50, 'pz', 1, false),
  ('Agua mineral Peñafiel 2 L',               (SELECT id FROM categories WHERE name='Agua y bebidas'), 29.50, 'pz', 1, false),
  ('Pasta La Moderna spaghetti ~450 g (×2)',  (SELECT id FROM categories WHERE name='Despensa seca'), 42.00, 'pz', 1, false),
  ('Galletas Gamesa sal',                     (SELECT id FROM categories WHERE name='Despensa seca'), 41.00, 'pz', 1, false),
  ('Pan Bimbo Cero ~610 g',                   (SELECT id FROM categories WHERE name='Despensa seca'), 73.00, 'pz', 1, false),
  ('Cereal Kellogg''s',                       (SELECT id FROM categories WHERE name='Despensa seca'), 69.50, 'pz', 1, false),
  ('Cereal Nestlé Corn Flakes',               (SELECT id FROM categories WHERE name='Despensa seca'), 63.00, 'pz', 1, false),
  ('Sopa pasta La Moderna (×2)',              (SELECT id FROM categories WHERE name='Despensa seca'), 42.00, 'pz', 1, false),
  ('Tortilla de harina',                      (SELECT id FROM categories WHERE name='Despensa seca'), 27.00, 'pz', 1, false),
  ('Tortillas de maíz',                       (SELECT id FROM categories WHERE name='Despensa seca'), 27.00, 'pz', 1, false),
  ('Harina 3 Estrellas',                      (SELECT id FROM categories WHERE name='Despensa seca'), 30.00, 'pz', 1, false),
  ('Avena Granvita bolsa',                    (SELECT id FROM categories WHERE name='Despensa seca'), 19.90, 'pz', 1, false),
  ('Café Portales tostado ~203 g',            (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 203.00, 'pz', 1, false),
  ('Jarabe tipo maple ~951 g',                (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 116.00, 'pz', 1, false),
  ('Mermelada McCormick fresa ~270 g',        (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 28.00, 'pz', 1, false),
  ('Salsa First Street',                      (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 85.00, 'pz', 1, false),
  ('Aceite Nutriolio ~180 ml',                (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 57.50, 'pz', 1, false),
  ('Saborizante vainilla',                    (SELECT id FROM categories WHERE name='Café, dulce y aderezos'), 25.00, 'pz', 1, false),
  ('Atún "Dora" aceite ~130 g (×7)',          (SELECT id FROM categories WHERE name='Conservas'), 112.00, 'pz', 1, false),
  ('Ensalada campesina (×2)',                 (SELECT id FROM categories WHERE name='Conservas'), 28.00, 'pz', 1, false),
  ('Huevo blanco SJ 18 pzas',                 (SELECT id FROM categories WHERE name='Aves'), 49.90, 'pz', 1, false),
  ('Calabaza italiana ~0.575 kg',             (SELECT id FROM categories WHERE name='Frutas y verduras'), 19.49, 'kg', 1, false),
  ('Zanahoria granel ~0.765 kg',              (SELECT id FROM categories WHERE name='Frutas y verduras'), 12.70, 'kg', 1, false),
  ('Limón Colima / agrio ~1.040 kg',          (SELECT id FROM categories WHERE name='Frutas y verduras'), 51.90, 'kg', 1, false),
  ('Nopal cambray (2 líneas ticket)',         (SELECT id FROM categories WHERE name='Frutas y verduras'), 76.37, 'kg', 1, false),
  ('Piña ~1.545 kg',                          (SELECT id FROM categories WHERE name='Frutas y verduras'), 34.30, 'kg', 1, false),
  ('Cebolla blanca ~0.355 kg',                (SELECT id FROM categories WHERE name='Frutas y verduras'), 8.09, 'kg', 1, false),
  ('Mango ataulfo ~0.730 kg',                 (SELECT id FROM categories WHERE name='Frutas y verduras'), 35.70, 'kg', 1, false),
  ('Tomate saladet ~0.640 kg',                (SELECT id FROM categories WHERE name='Frutas y verduras'), 34.94, 'kg', 1, false),
  ('Pepino verde ~0.755 kg',                  (SELECT id FROM categories WHERE name='Frutas y verduras'), 43.71, 'kg', 1, false),
  ('Pechuga de pavo natural ~0.425 kg',       (SELECT id FROM categories WHERE name='Salchichonería'), 172.55, 'kg', 1, false),
  ('Salchicha Lala Pley',                     (SELECT id FROM categories WHERE name='Salchichonería'), 51.00, 'pz', 1, false),
  ('Queso parmesano Galbani ~0.190 kg',       (SELECT id FROM categories WHERE name='Lácteos refrigerados'), 97.47, 'kg', 1, false),
  ('Queso crema Lala 190 g (×4)',             (SELECT id FROM categories WHERE name='Lácteos refrigerados'), 128.00, 'pz', 1, false),
  ('Crema para batir Lyon 500 ml',            (SELECT id FROM categories WHERE name='Lácteos refrigerados'), 68.00, 'pz', 1, false),
  ('Mantequilla Gloria 90 g',                 (SELECT id FROM categories WHERE name='Lácteos refrigerados'), 22.00, 'pz', 1, false),
  ('Yoghurt Yoplait "Grandes" (×2)',          (SELECT id FROM categories WHERE name='Lácteos refrigerados'), 214.00, 'pz', 1, false),
  ('Mix mora congelada ~450 g (×2)',          (SELECT id FROM categories WHERE name='Congelados'), 184.00, 'pz', 1, false),
  ('Fresas congeladas Vima ~450 g',           (SELECT id FROM categories WHERE name='Congelados'), 59.00, 'pz', 1, false),
  ('Fabuloso ~2 L',                           (SELECT id FROM categories WHERE name='Aseo hogar'), 60.00, 'pz', 1, false),
  ('Servilletas Fancy',                       (SELECT id FROM categories WHERE name='Aseo hogar'), 37.00, 'pz', 1, false),
  ('Toalla de papel Chedraui (×2 rolls)',     (SELECT id FROM categories WHERE name='Aseo hogar'), 51.00, 'pz', 1, false),
  ('Bolsa basura jumbo (×2)',                 (SELECT id FROM categories WHERE name='Aseo hogar'), 76.00, 'pz', 1, false),
  ('Jabón líquido Nivea',                     (SELECT id FROM categories WHERE name='Higiene y farmacia'), 110.00, 'pz', 1, false),
  ('Body mist Chupa Chups',                   (SELECT id FROM categories WHERE name='Higiene y farmacia'), 75.00, 'pz', 1, false),
  ('Fragancia tipo Juicy',                    (SELECT id FROM categories WHERE name='Higiene y farmacia'), 229.00, 'pz', 1, false),
  ('Algodón facial',                          (SELECT id FROM categories WHERE name='Higiene y farmacia'), 157.00, 'pz', 1, false),
  ('Lubricante íntimo',                       (SELECT id FROM categories WHERE name='Higiene y farmacia'), 105.00, 'pz', 1, false),
  ('Preservativos Caribbean (promo)',         (SELECT id FROM categories WHERE name='Higiene y farmacia'), 400.00, 'pz', 1, false),
  ('Portabolsas / organizador',               (SELECT id FROM categories WHERE name='Otros'), 49.00, 'pz', 1, false),
  ('Tapete mascotas Smilepets',               (SELECT id FROM categories WHERE name='Otros'), 159.00, 'pz', 1, false);

COMMIT;
