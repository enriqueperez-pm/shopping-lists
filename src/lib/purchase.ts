import { getBrowserSupabase } from "@/lib/supabase/client";
import { getFinanceDb } from "@/features/finance/finance-bridge";
import { findGroceriesConcept } from "@/features/finance/finance-linking";
import type { PurchaseTrip, ShoppingItem } from "./types";

export function itemStatus(item: ShoppingItem) {
  return item.status ?? (item.checked ? "purchased" : "needed");
}

export type RecordTripResult = {
  trip: PurchaseTrip | null;
  budgetTxId?: string;
  undo?: () => Promise<void>;
};

export async function recordPurchaseTrip(items: ShoppingItem[]): Promise<RecordTripResult> {
  if (items.length === 0) return { trip: null };

  const supabase = getBrowserSupabase();
  const total = items.reduce((sum, s) => sum + s.qty * s.price, 0);
  const period = new Date().toISOString().slice(0, 7);
  const uid = (await supabase.auth.getUser()).data.user?.id;

  const { data: trip, error: tripErr } = await supabase
    .from("purchase_trips")
    .insert({
      total,
      item_count: items.length,
      ...(uid ? { user_id: uid } : {}),
    })
    .select()
    .single();

  if (tripErr || !trip) return { trip: null };

  const sourceId = `trip_${trip.id}`;
  let budgetTxId: string | undefined;
  const db = getFinanceDb();

  if (db) {
    const existing = db.getTransactions(period).find((tx) => tx.sourceId === sourceId);
    if (!existing) {
      const groceries = findGroceriesConcept(db, period);
      if (groceries) {
        const tx = db.addTransaction({
          type: "expense",
          description: `Compra super (${items.length} productos)`,
          amount: total,
          category: groceries.category,
          subcategory: groceries.subcategory,
          date: new Date().toISOString().slice(0, 10),
          currency: "MXN",
          originalAmount: total,
          originalCurrency: "MXN",
          source: "shopping_trip",
          sourceId,
          budgetConceptId: groceries.id,
          notes: `Visita ${String(trip.id).slice(0, 8)}`,
        });
        budgetTxId = tx.id;
      }
    }
  }

  if (budgetTxId) {
    await supabase.from("purchase_trips").update({ budget_tx_id: budgetTxId }).eq("id", trip.id);
  }

  const rows = items.map((s) => ({
    trip_id: trip.id,
    product_id: s.product_id,
    product_name: s.product?.name ?? "Producto",
    category_name: s.product?.category?.name ?? null,
    qty: s.qty,
    unit: s.product?.unit ?? "pz",
    price: s.price,
    line_total: s.qty * s.price,
    ...(uid ? { user_id: uid } : {}),
  }));

  await supabase.from("purchase_trip_items").insert(rows);

  const tripId = String(trip.id);
  const txId = budgetTxId;

  return {
    trip: trip as PurchaseTrip,
    budgetTxId: txId,
    undo: async () => {
      if (txId && db) db.deleteTransaction(txId);
      await supabase.from("purchase_trips").delete().eq("id", tripId);
    },
  };
}

export async function revertPurchaseTrip(tripId: string, budgetTxId?: string | null) {
  const db = getFinanceDb();
  if (budgetTxId && db) db.deleteTransaction(budgetTxId);
  await getBrowserSupabase().from("purchase_trips").delete().eq("id", tripId);
}
