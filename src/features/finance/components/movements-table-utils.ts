import type { EnhancedTransaction } from "../FinancialDatabase";
import { resolveAmountMxn } from "../period-math";

export type MovementSortKey = "date" | "amount" | "description" | "category";
export type SortDir = "asc" | "desc";

export type MovementTableField =
  | "date"
  | "type"
  | "description"
  | "amount"
  | "category"
  | "subcategory"
  | "accountId"
  | "linkReviewStatus"
  | "notes";

export interface MovementTableAggregates {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
  net: number;
}

export function computeMovementAggregates(rows: EnhancedTransaction[]): MovementTableAggregates {
  let expenseTotal = 0;
  let incomeTotal = 0;
  for (const tx of rows) {
    if (tx.type === "transfer") continue;
    const amount = resolveAmountMxn(tx);
    if (tx.type === "income") incomeTotal += amount;
    else if (tx.type === "expense") expenseTotal += amount;
  }
  return {
    count: rows.filter((tx) => tx.type !== "transfer").length,
    expenseTotal: Math.round(expenseTotal * 100) / 100,
    incomeTotal: Math.round(incomeTotal * 100) / 100,
    net: Math.round((incomeTotal - expenseTotal) * 100) / 100,
  };
}

export function sortMovements(
  rows: EnhancedTransaction[],
  key: MovementSortKey,
  dir: SortDir,
): EnhancedTransaction[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "date") {
      return mult * (a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp));
    }
    if (key === "amount") {
      return mult * (resolveAmountMxn(a) - resolveAmountMxn(b));
    }
    if (key === "description") {
      return mult * a.description.localeCompare(b.description, "es");
    }
    const catA = `${a.category}|${a.subcategory ?? ""}`;
    const catB = `${b.category}|${b.subcategory ?? ""}`;
    return mult * catA.localeCompare(catB, "es");
  });
}

export function groupMovementsByCategory(
  rows: EnhancedTransaction[],
): Array<{ category: string; rows: EnhancedTransaction[]; subtotal: MovementTableAggregates }> {
  const map = new Map<string, EnhancedTransaction[]>();
  for (const tx of rows) {
    const cat = tx.category || "Sin categoría";
    const list = map.get(cat) ?? [];
    list.push(tx);
    map.set(cat, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([category, groupRows]) => ({
      category,
      rows: groupRows,
      subtotal: computeMovementAggregates(groupRows),
    }));
}

export function sourceLabel(source?: EnhancedTransaction["source"]): string {
  if (source === "import") return "Import";
  if (source === "shopping_trip") return "Super";
  if (source === "transfer") return "Transfer";
  if (source === "bank") return "Banco";
  return "Manual";
}

export function linkStatusLabel(status?: EnhancedTransaction["linkReviewStatus"]): string {
  if (status === "confirmed") return "OK";
  if (status === "incorrect") return "Incorrecto";
  if (status === "pending") return "Pendiente";
  return "—";
}
