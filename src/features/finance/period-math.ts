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

/** Ejecutado por concepto = suma de txs ligadas (cualquier fecha; pago en jun de adeudo feb). */
export function actualByConceptFromAllTransactions(
  transactions: EnhancedTransaction[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.budgetConceptId) continue;
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
  options?: ListPendingPaymentsOptions,
): number {
  return roundMoney(
    listPendingPayments(concepts, transactions, period, options).reduce(
      (sum, item) => sum + item.pending,
      0,
    ),
  );
}

export interface PendingPaymentItem {
  conceptId: string;
  name: string;
  category: string;
  subcategory?: string;
  budgeted: number;
  paid: number;
  pending: number;
  originPeriod: string;
}

export interface ListPendingPaymentsOptions {
  /** Incluye adeudos de meses anteriores al periodo visible (default: true). */
  includePriorPeriods?: boolean;
}

export function listPendingPayments(
  concepts: BudgetConcept[],
  transactions: EnhancedTransaction[],
  period: string,
  options?: ListPendingPaymentsOptions,
): PendingPaymentItem[] {
  const includePrior = options?.includePriorPeriods !== false;
  const actualByConcept = actualByConceptFromAllTransactions(transactions);

  return concepts
    .filter((c) => {
      if (c.isParent || c.type !== "expense") return false;
      if (c.period === period) return true;
      return includePrior && c.period < period;
    })
    .map((c) => {
      const paid = actualByConcept.get(c.id) ?? 0;
      const pending = Math.max(0, roundMoney((c.budgetedAmount || 0) - paid));
      return {
        conceptId: c.id,
        name: c.name,
        category: c.category,
        subcategory: c.subcategory,
        budgeted: c.budgetedAmount || 0,
        paid,
        pending,
        originPeriod: c.period,
      };
    })
    .filter((item) => item.pending > 0)
    .sort(
      (a, b) =>
        a.originPeriod.localeCompare(b.originPeriod) ||
        b.pending - a.pending ||
        a.name.localeCompare(b.name, "es"),
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
    { includePriorPeriods: true },
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
