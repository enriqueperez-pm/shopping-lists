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

-- 6. Seed: todos los productos de la despensa Chedraui
INSERT INTO products (name, category_id, ref_price, unit, ref_qty, in_stock) VALUES
  -- Agua y bebidas (1)
  ('Agua Ciel garrafón 10 L',               1,  44.50, 'pz', 1, false),
  ('Agua mineral Peñafiel 2 L',             1,  29.50, 'pz', 1, false),
  -- Despensa seca (2)
  ('Pasta La Moderna spaghetti ~450 g (×2)', 2,  42.00, 'pz', 2, false),
  ('Galletas Gamesa sal',                    2,  41.00, 'pz', 1, false),
  ('Pan Bimbo Cero ~610 g',                 2,  73.00, 'pz', 1, false),
  ('Cereal Kellogg''s',                      2,  69.50, 'pz', 1, false),
  ('Cereal Nestlé Corn Flakes',             2,  63.00, 'pz', 1, false),
  ('Sopa pasta La Moderna (×2)',             2,  42.00, 'pz', 2, false),
  ('Tortilla de harina',                    2,  27.00, 'pz', 1, false),
  ('Tortillas de maíz',                     2,  27.00, 'pz', 1, false),
  ('Harina 3 Estrellas',                    2,  30.00, 'pz', 1, false),
  ('Avena Granvita bolsa',                  2,  19.90, 'pz', 1, false),
  -- Café, dulce y aderezos (3)
  ('Café Portales tostado ~203 g',          3, 203.00, 'pz', 1, false),
  ('Jarabe tipo maple ~951 g',              3, 116.00, 'pz', 1, false),
  ('Mermelada McCormick fresa ~270 g',      3,  28.00, 'pz', 1, false),
  ('Salsa First Street',                    3,  85.00, 'pz', 1, false),
  ('Aceite Nutriolio ~180 ml',              3,  57.50, 'pz', 1, false),
  ('Saborizante vainilla',                  3,  25.00, 'pz', 1, false),
  -- Conservas (4)
  ('Atún "Dora" aceite ~130 g (×7)',        4, 112.00, 'pz', 1, false),
  ('Ensalada campesina (×2)',               4,  28.00, 'pz', 2, false),
  -- Aves (5)
  ('Huevo blanco SJ 18 pzas',              5,  49.90, 'pz', 1, false),
  -- Frutas y verduras (6)
  ('Calabaza italiana ~0.575 kg',           6,  19.49, 'kg', 1, false),
  ('Zanahoria granel ~0.765 kg',            6,  12.70, 'kg', 1, false),
  ('Limón Colima / agrio ~1.040 kg',        6,  51.90, 'kg', 1, false),
  ('Nopal cambray',                         6,  76.37, 'kg', 1, false),
  ('Piña ~1.545 kg',                        6,  34.30, 'kg', 1, false),
  ('Cebolla blanca ~0.355 kg',              6,   8.09, 'kg', 1, false),
  ('Mango ataulfo ~0.730 kg',               6,  35.70, 'kg', 1, false),
  ('Tomate saladet ~0.640 kg',              6,  34.94, 'kg', 1, false),
  ('Pepino verde ~0.755 kg',                6,  43.71, 'kg', 1, false),
  -- Salchichonería (7)
  ('Pechuga de pavo natural ~0.425 kg',     7, 172.55, 'kg', 1, false),
  ('Salchicha Lala Pley',                   7,  51.00, 'pz', 1, false),
  -- Lácteos refrigerados (8)
  ('Queso parmesano Galbani ~0.190 kg',     8,  97.47, 'kg', 1, false),
  ('Queso crema Lala 190 g (×4)',           8, 128.00, 'pz', 4, false),
  ('Crema para batir Lyon 500 ml',          8,  68.00, 'pz', 1, false),
  ('Mantequilla Gloria 90 g',               8,  22.00, 'pz', 1, false),
  ('Yoghurt Yoplait "Grandes" (×2)',        8, 214.00, 'pz', 2, false),
  -- Congelados (9)
  ('Mix mora congelada ~450 g (×2)',        9, 184.00, 'pz', 2, false),
  ('Fresas congeladas Vima ~450 g',         9,  59.00, 'pz', 1, false),
  -- Aseo hogar (10)
  ('Fabuloso ~2 L',                        10,  60.00, 'pz', 1, false),
  ('Servilletas Fancy',                    10,  37.00, 'pz', 1, false),
  ('Toalla de papel Chedraui (×2 rolls)',  10,  51.00, 'pz', 2, false),
  ('Bolsa basura jumbo (×2)',              10,  76.00, 'pz', 2, false),
  -- Higiene y farmacia (11)
  ('Jabón líquido Nivea',                  11, 110.00, 'pz', 1, false),
  ('Body mist Chupa Chups',               11,  75.00, 'pz', 1, false),
  ('Fragancia tipo Juicy',                 11, 229.00, 'pz', 1, false),
  ('Algodón facial',                       11, 157.00, 'pz', 1, false),
  ('Lubricante íntimo',                    11, 105.00, 'pz', 1, false),
  ('Preservativos Caribbean (promo)',      11, 400.00, 'pz', 1, false),
  -- Otros (12)
  ('Portabolsas / organizador',            12,  49.00, 'pz', 1, false),
  ('Tapete mascotas Smilepets',            12, 159.00, 'pz', 1, false);
