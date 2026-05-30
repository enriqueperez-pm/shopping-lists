-- Backfill shopping_items for products not in pantry and without a list row
INSERT INTO shopping_items (product_id, qty, price, status, checked)
SELECT p.id, p.ref_qty, p.ref_price, 'needed', false
FROM products p
WHERE p.in_stock = false
  AND NOT EXISTS (
    SELECT 1 FROM shopping_items si WHERE si.product_id = p.id
  )
ON CONFLICT (product_id) DO NOTHING;
