-- ============================================================
-- Sync directo desde lista-chedraui-pendiente.html (DEFAULT_PRODUCTS)
-- Uso: ejecutar en SQL Editor cuando quieras reemplazar la despensa
-- ============================================================

BEGIN;

-- Limpia lista y despensa actual
DELETE FROM shopping_items;
DELETE FROM products;

-- Inserta catálogo actualizado de Despensa
INSERT INTO products (name, category_id, ref_price, unit, ref_qty, in_stock) VALUES
  ('Agua Ciel garrafón 10 L',                 1,  44.50, 'pz', 1, false),
  ('Agua mineral Peñafiel 2 L',               1,  29.50, 'pz', 1, false),
  ('Pasta La Moderna spaghetti ~450 g (×2)',  2,  42.00, 'pz', 1, false),
  ('Galletas Gamesa sal',                     2,  41.00, 'pz', 1, false),
  ('Pan Bimbo Cero ~610 g',                   2,  73.00, 'pz', 1, false),
  ('Cereal Kellogg''s',                       2,  69.50, 'pz', 1, false),
  ('Cereal Nestlé Corn Flakes',               2,  63.00, 'pz', 1, false),
  ('Sopa pasta La Moderna (×2)',              2,  42.00, 'pz', 1, false),
  ('Tortilla de harina',                      2,  27.00, 'pz', 1, false),
  ('Tortillas de maíz',                       2,  27.00, 'pz', 1, false),
  ('Harina 3 Estrellas',                      2,  30.00, 'pz', 1, false),
  ('Avena Granvita bolsa',                    2,  19.90, 'pz', 1, false),
  ('Café Portales tostado ~203 g',            3, 203.00, 'pz', 1, false),
  ('Jarabe tipo maple ~951 g',                3, 116.00, 'pz', 1, false),
  ('Mermelada McCormick fresa ~270 g',        3,  28.00, 'pz', 1, false),
  ('Salsa First Street',                      3,  85.00, 'pz', 1, false),
  ('Aceite Nutriolio ~180 ml',                3,  57.50, 'pz', 1, false),
  ('Saborizante vainilla',                    3,  25.00, 'pz', 1, false),
  ('Atún "Dora" aceite ~130 g (×7)',          4, 112.00, 'pz', 1, false),
  ('Ensalada campesina (×2)',                 4,  28.00, 'pz', 1, false),
  ('Huevo blanco SJ 18 pzas',                 5,  49.90, 'pz', 1, false),
  ('Calabaza italiana ~0.575 kg',             6,  19.49, 'kg', 1, false),
  ('Zanahoria granel ~0.765 kg',              6,  12.70, 'kg', 1, false),
  ('Limón Colima / agrio ~1.040 kg',          6,  51.90, 'kg', 1, false),
  ('Nopal cambray (2 líneas ticket)',         6,  76.37, 'kg', 1, false),
  ('Piña ~1.545 kg',                          6,  34.30, 'kg', 1, false),
  ('Cebolla blanca ~0.355 kg',                6,   8.09, 'kg', 1, false),
  ('Mango ataulfo ~0.730 kg',                 6,  35.70, 'kg', 1, false),
  ('Tomate saladet ~0.640 kg',                6,  34.94, 'kg', 1, false),
  ('Pepino verde ~0.755 kg',                  6,  43.71, 'kg', 1, false),
  ('Pechuga de pavo natural ~0.425 kg',       7, 172.55, 'kg', 1, false),
  ('Salchicha Lala Pley',                     7,  51.00, 'pz', 1, false),
  ('Queso parmesano Galbani ~0.190 kg',       8,  97.47, 'kg', 1, false),
  ('Queso crema Lala 190 g (×4)',             8, 128.00, 'pz', 1, false),
  ('Crema para batir Lyon 500 ml',            8,  68.00, 'pz', 1, false),
  ('Mantequilla Gloria 90 g',                 8,  22.00, 'pz', 1, false),
  ('Yoghurt Yoplait "Grandes" (×2)',          8, 214.00, 'pz', 1, false),
  ('Mix mora congelada ~450 g (×2)',          9, 184.00, 'pz', 1, false),
  ('Fresas congeladas Vima ~450 g',           9,  59.00, 'pz', 1, false),
  ('Fabuloso ~2 L',                          10,  60.00, 'pz', 1, false),
  ('Servilletas Fancy',                      10,  37.00, 'pz', 1, false),
  ('Toalla de papel Chedraui (×2 rolls)',    10,  51.00, 'pz', 1, false),
  ('Bolsa basura jumbo (×2)',                10,  76.00, 'pz', 1, false),
  ('Jabón líquido Nivea',                    11, 110.00, 'pz', 1, false),
  ('Body mist Chupa Chups',                  11,  75.00, 'pz', 1, false),
  ('Fragancia tipo Juicy',                   11, 229.00, 'pz', 1, false),
  ('Algodón facial',                         11, 157.00, 'pz', 1, false),
  ('Lubricante íntimo',                      11, 105.00, 'pz', 1, false),
  ('Preservativos Caribbean (promo)',        11, 400.00, 'pz', 1, false),
  ('Portabolsas / organizador',              12,  49.00, 'pz', 1, false),
  ('Tapete mascotas Smilepets',              12, 159.00, 'pz', 1, false);

COMMIT;
