import type { EnhancedTransaction } from "./FinancialDatabase";
import type { BudgetConcept } from "./types";

/** Redondeo a centavos MXN (evita drift float). */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveAmountMxn(tx: EnhancedTransaction): number {
  const raw =
    tx.originalCurrency === "MXN" || tx.currency === "MXN"
      ? (tx.originalAmount ?? tx.amount)
      : tx.amount;
  return roundMoney(raw);
}

export function getPeriodMovements(
  transactions: EnhancedTransaction[],
  period: string,
): EnhancedTransaction[] {
  return transactions
    .filter((tx) => tx.type !== "transfer" && tx.date.startsWith(period))
    .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
}

export function sumIncome(movements: EnhancedTransaction[]): number {
  return roundMoney(
    movements.filter((m) => m.type === "income").reduce((s, m) => s + resolveAmountMxn(m), 0),
  );
}

export function sumSpent(movements: EnhancedTransaction[]): number {
  return roundMoney(
    movements.filter((m) => m.type === "expense").reduce((s, m) => s + resolveAmountMxn(m), 0),
  );
}

/** Ejecutado por concepto = suma de transacciones ligadas (misma regla que Presupuesto). */
export function actualByConceptFromTransactions(
  transactions: EnhancedTransaction[],
  period: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.budgetConceptId || !tx.date.startsWith(period)) continue;
    if (tx.type !== "income" && tx.type !== "expense") continue;
    map.set(
      tx.budgetConceptId,
      roundMoney((map.get(tx.budgetConceptId) ?? 0) + resolveAmountMxn(tx)),
    );
  }
  return map;
}

/** Por pagar = presupuesto pendiente según transacciones reales, no actualAmount del CSV. */
export function calcCommittedFromTransactions(
  concepts: BudgetConcept[],
  transactions: EnhancedTransaction[],
  period: string,
): number {
  const actualByConcept = actualByConceptFromTransactions(transactions, period);
  return roundMoney(
    concepts
      .filter((c) => !c.isParent && c.type === "expense" && c.period === period)
      .reduce((sum, c) => {
        const executed = actualByConcept.get(c.id) ?? 0;
        return sum + Math.max(0, roundMoney((c.budgetedAmount || 0) - executed));
      }, 0),
  );
}

export interface PeriodMoneyMetrics {
  income: number;
  spent: number;
  committed: number;
  calculated: number;
  disponible: number;
  net: number;
  spentPct: number;
  committedPct: number;
  totalCommittedPct: number;
}

export function buildPeriodMoneyMetrics(input: {
  transactions: EnhancedTransaction[];
  concepts: BudgetConcept[];
  period: string;
  manualOverride: number | null;
}): PeriodMoneyMetrics {
  const movements = getPeriodMovements(input.transactions, input.period);
  const income = sumIncome(movements);
  const spent = sumSpent(movements);
  const committed = calcCommittedFromTransactions(
    input.concepts,
    input.transactions,
    input.period,
  );
  const calculated = roundMoney(income - spent - committed);
  const disponible =
    input.manualOverride != null ? roundMoney(input.manualOverride) : calculated;
  const net = roundMoney(income - spent);

  const spentPct = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0;
  const committedPct = income > 0 ? Math.min(100, Math.round((committed / income) * 100)) : 0;
  const totalCommittedPct =
    income > 0 ? Math.min(100, Math.round(((spent + committed) / income) * 100)) : 0;

  return {
    income,
    spent,
    committed,
    calculated,
    disponible,
    net,
    spentPct,
    committedPct,
    totalCommittedPct,
  };
}
