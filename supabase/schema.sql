-- ============================================================
-- Shopping Lists — Supabase schema
-- Ejecutar en SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Categorias
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO categories (name, sort_order) VALUES
  ('Agua y bebidas', 1),
  ('Despensa seca', 2),
  ('Cafe, dulce y aderezos', 3),
  ('Conservas', 4),
  ('Aves', 5),
  ('Frutas y verduras', 6),
  ('Salchichoneria', 7),
  ('Lacteos refrigerados', 8),
  ('Congelados', 9),
  ('Aseo hogar', 10),
  ('Higiene y farmacia', 11),
  ('Otros', 12)
ON CONFLICT (name) DO NOTHING;

-- 2. Productos (despensa / inventario)
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

-- 3. Items de la lista de compras
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC(10,3) NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT false,
  weight_grams NUMERIC(10,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shopping_updated
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Row Level Security (public read/write por ahora — sin auth)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_categories"  ON categories FOR SELECT USING (true);
CREATE POLICY "public_read_products"    ON products FOR SELECT USING (true);
CREATE POLICY "public_write_products"   ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read_shopping"    ON shopping_items FOR SELECT USING (true);
CREATE POLICY "public_write_shopping"   ON shopping_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Seed: productos iniciales
INSERT INTO products (name, category_id, ref_price, unit, ref_qty, in_stock) VALUES
  ('Agua Ciel garrafon 10 L',        1, 44.50, 'pz', 1, false),
  ('Agua mineral Penafiel 2 L',      1, 29.50, 'pz', 1, false),
  ('Pasta La Moderna spaghetti 450g', 2, 42.00, 'pz', 2, false),
  ('Pan Bimbo Cero 610g',            2, 73.00, 'pz', 1, false),
  ('Tortilla de harina',             2, 27.00, 'pz', 1, false),
  ('Tortillas de maiz',              2, 27.00, 'pz', 1, false),
  ('Avena Granvita bolsa',           2, 19.90, 'pz', 1, false),
  ('Cafe Portales tostado 203g',     3, 203.00,'pz', 1, false),
  ('Mermelada McCormick fresa 270g', 3, 28.00, 'pz', 1, false),
  ('Atun Dora aceite 130g (x7)',     4, 112.00,'pz', 1, false),
  ('Huevo blanco SJ 18 pzas',       5, 49.90, 'pz', 1, false),
  ('Limon Colima 1kg',               6, 51.90, 'kg', 1, false),
  ('Manzana red delicious',          6, 48.00, 'kg', 1, false),
  ('Tomate saladet 640g',            6, 34.94, 'kg', 1, false),
  ('Cebolla blanca 355g',            6, 8.09,  'kg', 1, false),
  ('Pechuga de pavo natural 425g',   7, 172.55,'kg', 1, false),
  ('Queso parmesano Galbani 190g',   8, 97.47, 'kg', 1, false),
  ('Leche entera 1L',                8, 28.50, 'pz', 2, true),
  ('Yoghurt Yoplait Grandes (x2)',   8, 214.00,'pz', 1, false),
  ('Mix mora congelada 450g (x2)',   9, 184.00,'pz', 1, false),
  ('Fabuloso 2L',                    10, 60.00,'pz', 1, false),
  ('Servilletas Fancy',              10, 37.00,'pz', 1, false),
  ('Jabon liquido Nivea',            11, 110.00,'pz',1, false);
