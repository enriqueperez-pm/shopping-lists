import type { FinancialPersistedData } from "./FinancialDatabase";
import type { BudgetConcept } from "./types";
import { buildPeriodMoneyMetrics } from "./period-math";
import { isCanonicalPair } from "./taxonomy-canonical";
import { buildBudgetAnalytics } from "./budget-analytics";
import { dedupeTransactionFingerprints } from "./transaction-dedupe";

export interface IntegrityIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface IntegrityReport {
  ok: boolean;
  issues: IntegrityIssue[];
}

function collectPeriods(payload: FinancialPersistedData): string[] {
  const periods = new Set<string>();
  for (const tx of payload.transactions ?? []) {
    if (tx.date?.length >= 7) periods.add(tx.date.slice(0, 7));
  }
  for (const c of (payload.moduleData?.budgetConcepts ?? []) as BudgetConcept[]) {
    if (c.period) periods.add(c.period);
  }
  return [...periods].sort();
}

export function runFinancialIntegrityChecks(payload: FinancialPersistedData): IntegrityReport {
  const issues: IntegrityIssue[] = [];
  const concepts = ((payload.moduleData?.budgetConcepts ?? []) as BudgetConcept[]).filter(
    (c) => !c.isParent,
  );
  const transactions = dedupeTransactionFingerprints(payload.transactions ?? []);
  const manualOverrides = payload.moduleData?.cashflowSettings?.manualAvailableByPeriod ?? {};

  for (const c of concepts) {
    if (!isCanonicalPair(c.type, c.category, c.subcategory || "")) {
      issues.push({
        code: "non_canonical_concept",
        message: `Concepto ${c.id} (${c.category}/${c.subcategory}) fuera de taxonomía`,
        severity: "error",
      });
    }
  }

  for (const tx of transactions) {
    if (tx.type !== "income" && tx.type !== "expense") continue;
    const txType = tx.type === "income" ? "income" : "expense";
    if (!isCanonicalPair(txType, tx.category, tx.subcategory || "")) {
      issues.push({
        code: "non_canonical_tx",
        message: `Tx ${tx.id} (${tx.category}/${tx.subcategory}) fuera de taxonomía`,
        severity: "warning",
      });
    }
  }

  for (const period of collectPeriods(payload)) {
    const metrics = buildPeriodMoneyMetrics({
      transactions,
      concepts,
      period,
      manualOverride: manualOverrides[period] ?? null,
    });
    const identity =
      metrics.income - metrics.spent - metrics.committed - metrics.disponible;
    if (Math.abs(identity) > 0.02) {
      issues.push({
        code: "period_identity",
        message: `Periodo ${period}: identidad cashflow falla (${identity.toFixed(2)})`,
        severity: "error",
      });
    }
  }

  for (const period of collectPeriods(payload)) {
    const analytics = buildBudgetAnalytics({ concepts, transactions, selectedPeriod: period });
    const totalActual = analytics.leafAnalyses.reduce((s, a) => s + a.actual, 0);
    const periodExpenseTx = transactions
      .filter((tx) => tx.type === "expense" && tx.date.startsWith(period))
      .reduce((s, tx) => s + tx.amount, 0);
    if (Math.abs(totalActual - periodExpenseTx) > 1 && periodExpenseTx > 0) {
      issues.push({
        code: "budget_vs_tx_drift",
        message: `Periodo ${period}: ejecutado presupuesto (${totalActual}) vs gastos txs (${periodExpenseTx})`,
        severity: "warning",
      });
    }
  }

  const seen = new Set<string>();
  for (const tx of transactions) {
    const fp = `${tx.date}|${tx.type}|${tx.amount}|${tx.description}`;
    if (seen.has(fp)) {
      issues.push({
        code: "duplicate_tx",
        message: `Posible duplicado: ${tx.description} ${tx.date}`,
        severity: "warning",
      });
    }
    seen.add(fp);
  }

  return {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}
