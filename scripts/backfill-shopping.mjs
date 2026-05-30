/**
 * Backfill shopping_items for products not in pantry and without a list row.
 * Equivalent to supabase/sync-shopping-from-products.sql
 */
import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function normalizeUrl(input) {
  return input.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

if (!rawUrl || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(normalizeUrl(rawUrl), key);

const { data: products, error: productsErr } = await supabase
  .from("products")
  .select("id, ref_qty, ref_price")
  .eq("in_stock", false);

if (productsErr) {
  console.error("Error fetching products:", productsErr.message);
  process.exit(1);
}

const { data: existing, error: itemsErr } = await supabase
  .from("shopping_items")
  .select("product_id");

if (itemsErr) {
  console.error("Error fetching shopping_items:", itemsErr.message);
  process.exit(1);
}

const existingIds = new Set((existing ?? []).map((r) => r.product_id));
const missing = (products ?? []).filter((p) => !existingIds.has(p.id));

if (missing.length === 0) {
  console.log("Backfill complete: 0 rows needed.");
  process.exit(0);
}

const rows = missing.map((p) => ({
  product_id: p.id,
  qty: p.ref_qty,
  price: p.ref_price,
  status: "needed",
  checked: false,
}));

let insertErr = (await supabase.from("shopping_items").upsert(rows, {
  onConflict: "product_id",
  ignoreDuplicates: true,
})).error;

if (insertErr?.message?.includes("status")) {
  const legacyRows = missing.map((p) => ({
    product_id: p.id,
    qty: p.ref_qty,
    price: p.ref_price,
    checked: false,
  }));
  insertErr = (await supabase.from("shopping_items").upsert(legacyRows, {
    onConflict: "product_id",
    ignoreDuplicates: true,
  })).error;
}

if (insertErr) {
  console.error("Error inserting rows:", insertErr.message);
  process.exit(1);
}

console.log(`Backfill complete: ${missing.length} shopping_items created.`);
