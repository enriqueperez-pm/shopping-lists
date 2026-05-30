import { supabase } from "./supabase";
import type { PurchaseTrip, ShoppingItem } from "./types";

export function itemStatus(item: ShoppingItem) {
  return item.status ?? (item.checked ? "purchased" : "needed");
}

export async function recordPurchaseTrip(items: ShoppingItem[]): Promise<PurchaseTrip | null> {
  if (items.length === 0) return null;

  const total = items.reduce((sum, s) => sum + s.qty * s.price, 0);
  const { data: trip, error: tripErr } = await supabase
    .from("purchase_trips")
    .insert({
      total,
      item_count: items.length,
    })
    .select()
    .single();

  if (tripErr || !trip) return null;

  const rows = items.map((s) => ({
    trip_id: trip.id,
    product_id: s.product_id,
    product_name: s.product?.name ?? "Producto",
    category_name: s.product?.category?.name ?? null,
    qty: s.qty,
    unit: s.product?.unit ?? "pz",
    price: s.price,
    line_total: s.qty * s.price,
  }));

  await supabase.from("purchase_trip_items").insert(rows);
  return trip as PurchaseTrip;
}
