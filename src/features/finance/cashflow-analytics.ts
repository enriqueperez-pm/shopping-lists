import type { EnhancedTransaction } from "./FinancialDatabase";
import type { BudgetConcept } from "./types";
import {
  buildPeriodMoneyMetrics,
  getPeriodMovements,
  resolveAmountMxn,
} from "./period-math";

export type CashflowMovementType = "income" | "expense";

export interface PeriodCashflow {
  income: number;
  spent: number;
  committed: number;
  calculated: number;
  manualOverride: number | null;
  disponible: number;
  net: number;
  /** @deprecated use totalCommittedPct */
  usagePct: number;
  spentPct: number;
  committedPct: number;
  totalCommittedPct: number;
  categoryBreakdown: [string, number][];
  allMovements: EnhancedTransaction[];
  recentMovements: EnhancedTransaction[];
}

export { getPeriodMovements, resolveAmountMxn };

export function sumByType(
  movements: EnhancedTransaction[],
  type: CashflowMovementType,
): number {
  return movements
    .filter((m) => m.type === type)
    .reduce((sum, m) => sum + resolveAmountMxn(m), 0);
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

export function buildPeriodCashflow(input: {
  transactions: EnhancedTransaction[];
  concepts: BudgetConcept[];
  selectedPeriod: string;
  manualOverride: number | null;
}): PeriodCashflow {
  const metrics = buildPeriodMoneyMetrics({
    transactions: input.transactions,
    concepts: input.concepts,
    period: input.selectedPeriod,
    manualOverride: input.manualOverride,
  });
  const allMovements = getPeriodMovements(input.transactions, input.selectedPeriod);

  return {
    ...metrics,
    manualOverride: input.manualOverride,
    usagePct: metrics.totalCommittedPct,
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
