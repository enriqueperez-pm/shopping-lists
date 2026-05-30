-- ============================================================
-- Aplica ticket de compra (ayer) sobre la base en Supabase
-- - Marca comprados como in_stock = true
-- - Actualiza ref_price/ref_qty/unit
-- - Inserta productos nuevos si no existen
-- - Quita esos productos de shopping_items
-- ============================================================

BEGIN;

WITH purchase_raw AS (
  SELECT * FROM (VALUES
    ('Despensa seca', 'Aceitunas Buffalo', 1::numeric, 27.00::numeric, 'pz'),
    ('Despensa seca', 'Pan Bimbo Cero ~610 g', 1, 73.00, 'pz'),
    ('Despensa seca', 'Tortilla de harina', 1, 32.00, 'pz'),

    ('Frutas y verduras', 'Cebolla blanca ~0.355 kg', 1, 8.00, 'kg'),
    ('Frutas y verduras', 'Limón', 1, 51.90, 'kg'),
    ('Frutas y verduras', 'Nopal cambray', 1, 76.88, 'kg'),
    ('Frutas y verduras', 'Piña ~1.545 kg', 2, 24.20, 'kg'),
    ('Frutas y verduras', 'Zanahoria granel ~0.765 kg', 3, 12.70, 'kg'),

    ('Salchichonería', 'Carne', 1, 177.00, 'pz'),
    ('Salchichonería', 'Carne molida', 1, 146.00, 'pz'),
    ('Salchichonería', 'Pechuga de pavo natural ~0.425 kg', 1, 160.00, 'kg'),

    ('Lácteos refrigerados', 'Crema para batir Lyon 500 ml', 1, 68.00, 'pz'),
    ('Lácteos refrigerados', 'Leche alpura', 3, 115.00, 'pz'),
    ('Lácteos refrigerados', 'Mantequilla Gloria 90 g', 1, 30.00, 'pz'),
    ('Lácteos refrigerados', 'Queso crema 190', 4, 53.50, 'pz'),
    ('Lácteos refrigerados', 'Queso parmesano Galbani ~0.190 kg', 1, 83.31, 'kg'),
    ('Lácteos refrigerados', 'Yoghurt Yoplait "Grandes" (×2)', 2, 107.00, 'pz'),

    ('Congelados', 'Fresas congeladas Vima ~450 g', 1, 59.00, 'pz'),
    ('Congelados', 'Mix mora congelada ~450 g (×2)', 2, 92.00, 'pz'),

    ('Aseo hogar', 'Bolsa basura jumbo', 1, 25.00, 'pz'),
    ('Aseo hogar', 'Fabuloso ~2 L', 1, 50.00, 'pz'),
    ('Aseo hogar', 'Jabón Roma', 1, 54.00, 'pz'),

    ('Higiene y farmacia', 'Agua micelar', 1, 160.00, 'pz'),
    ('Higiene y farmacia', 'Body mist Chupa Chups', 1, 75.00, 'pz'),
    ('Higiene y farmacia', 'Cepillos de dientes', 1, 39.00, 'pz'),
    ('Higiene y farmacia', 'Jabón líquido Nivea', 1, 110.00, 'pz'),
    ('Higiene y farmacia', 'Papel de baño', 1, 119.00, 'pz'),
    ('Higiene y farmacia', 'Papel de baño humedo', 2, 59.50, 'pz'),
    ('Higiene y farmacia', 'Pasta de dientes', 2, 33.00, 'pz'),
    ('Higiene y farmacia', 'Rastrillos', 1, 145.00, 'pz'),
    ('Higiene y farmacia', 'Shampoo palmolive', 1, 70.00, 'pz'),

    ('Otros', 'Jabón roma', 1, 54.00, 'pz'),
    ('Otros', 'Mantequilla untable gloria', 1, 327.00, 'pz')
  ) AS t(category_name, raw_name, qty, pu, unit)
),
purchase_norm AS (
  SELECT
    CASE
      WHEN lower(raw_name) = lower('Limón') THEN 'Limón Colima / agrio ~1.040 kg'
      WHEN lower(raw_name) = lower('Nopal cambray') THEN 'Nopal cambray (2 líneas ticket)'
      WHEN lower(raw_name) = lower('Queso crema 190') THEN 'Queso crema Lala 190 g (×4)'
      WHEN lower(raw_name) = lower('Bolsa basura jumbo') THEN 'Bolsa basura jumbo (×2)'
      WHEN lower(raw_name) IN (lower('Jabón roma'), lower('Jabón Roma')) THEN 'Jabón Roma'
      ELSE raw_name
    END AS canonical_name,
    CASE
      WHEN lower(raw_name) IN (lower('Jabón roma'), lower('Jabón Roma')) THEN 'Aseo hogar'
      ELSE category_name
    END AS canonical_category,
    qty,
    pu,
    unit
  FROM purchase_raw
),
purchase_agg AS (
  SELECT
    canonical_name AS name,
    canonical_category AS category_name,
    SUM(qty) AS qty,
    MAX(pu) AS pu,
    MAX(unit) AS unit
  FROM purchase_norm
  GROUP BY canonical_name, canonical_category
),
updated AS (
  UPDATE products p
  SET
    ref_price = a.pu,
    ref_qty = LEAST(99, GREATEST(1, a.qty::int)),
    unit = a.unit,
    in_stock = true,
    category_id = c.id
  FROM purchase_agg a
  JOIN categories c ON c.name = a.category_name
  WHERE lower(p.name) = lower(a.name)
  RETURNING p.id, p.name
),
inserted AS (
  INSERT INTO products (name, category_id, ref_price, ref_qty, unit, in_stock)
  SELECT
    a.name,
    c.id,
    a.pu,
    LEAST(99, GREATEST(1, a.qty::int)),
    a.unit,
    true
  FROM purchase_agg a
  JOIN categories c ON c.name = a.category_name
  WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE lower(p.name) = lower(a.name)
  )
  RETURNING id, name
)
DELETE FROM shopping_items si
USING products p, purchase_agg a
WHERE si.product_id = p.id
  AND lower(p.name) = lower(a.name);

COMMIT;
