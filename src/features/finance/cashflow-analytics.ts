import type { EnhancedTransaction } from "./FinancialDatabase";
import type { BudgetConcept } from "./types";

export type CashflowMovementType = "income" | "expense";

export interface PeriodCashflow {
  income: number;
  spent: number;
  committed: number;
  calculated: number;
  manualOverride: number | null;
  disponible: number;
  net: number;
  usagePct: number;
  categoryBreakdown: [string, number][];
  allMovements: EnhancedTransaction[];
  recentMovements: EnhancedTransaction[];
}

const resolveAmountMxn = (tx: EnhancedTransaction) =>
  tx.originalCurrency === "MXN" || tx.currency === "MXN"
    ? (tx.originalAmount ?? tx.amount)
    : tx.amount;

export function getPeriodMovements(
  transactions: EnhancedTransaction[],
  period: string,
): EnhancedTransaction[] {
  return transactions
    .filter((tx) => tx.type !== "transfer" && tx.date.startsWith(period))
    .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
}

export function sumByType(
  movements: EnhancedTransaction[],
  type: CashflowMovementType,
): number {
  return movements
    .filter((m) => m.type === type)
    .reduce((sum, m) => sum + resolveAmountMxn(m), 0);
}

export function calcCommitted(concepts: BudgetConcept[], period: string): number {
  return concepts
    .filter((c) => !c.isParent && c.type === "expense" && c.period === period)
    .reduce((sum, c) => sum + Math.max(0, (c.budgetedAmount || 0) - (c.actualAmount || 0)), 0);
}

export function categoryBreakdownFromMovements(
  movements: EnhancedTransaction[],
): [string, number][] {
  const byCat: Record<string, number> = {};
  for (const m of movements) {
    if (m.type !== "expense") continue;
    const cat = m.category || "Otros";
    byCat[cat] = (byCat[cat] || 0) + resolveAmountMxn(m);
  }
  return Object.entries(byCat).sort((a, b) => b[1] - a[1]);
}

export function computeDisponible(input: {
  income: number;
  spent: number;
  committed: number;
  manualOverride: number | null;
}): { calculated: number; disponible: number } {
  const calculated = input.income - input.spent - input.committed;
  const disponible = input.manualOverride != null ? input.manualOverride : calculated;
  return { calculated, disponible };
}

export function buildPeriodCashflow(input: {
  transactions: EnhancedTransaction[];
  concepts: BudgetConcept[];
  selectedPeriod: string;
  manualOverride: number | null;
}): PeriodCashflow {
  const allMovements = getPeriodMovements(input.transactions, input.selectedPeriod);
  const income = sumByType(allMovements, "income");
  const spent = sumByType(allMovements, "expense");
  const committed = calcCommitted(input.concepts, input.selectedPeriod);
  const { calculated, disponible } = computeDisponible({
    income,
    spent,
    committed,
    manualOverride: input.manualOverride,
  });
  const net = income - spent;
  const usagePct =
    income > 0 ? Math.min(100, Math.round(((spent + committed) / income) * 100)) : 0;

  return {
    income,
    spent,
    committed,
    calculated,
    manualOverride: input.manualOverride,
    disponible,
    net,
    usagePct,
    categoryBreakdown: categoryBreakdownFromMovements(allMovements),
    allMovements,
    recentMovements: allMovements.slice(0, 5),
  };
}

export function formatMovementDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function movementCategoryLabel(tx: EnhancedTransaction): string | null {
  if (!tx.category) return null;
  return tx.subcategory ? `${tx.category} · ${tx.subcategory}` : tx.category;
}
