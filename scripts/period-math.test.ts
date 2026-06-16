/**
 * Verifica period-math: identidad ingresos = gastado + por_pagar + disponible.
 * Ejecutar: npx tsx scripts/period-math.test.ts
 */
import {
  buildPeriodMoneyMetrics,
  calcCommittedFromTransactions,
  listPendingPayments,
} from "../src/features/finance/period-math";
import type { EnhancedTransaction } from "../src/features/finance/FinancialDatabase";
import type { BudgetConcept } from "../src/features/finance/types";

const period = "2026-06";

const transactions: EnhancedTransaction[] = [
  {
    id: "tx_income",
    type: "income",
    description: "Nómina",
    amount: 77087,
    category: "Salary",
    date: "2026-06-01",
    timestamp: "2026-06-01T12:00:00.000Z",
    source: "manual",
    currency: "MXN",
    budgetConceptId: "brain_2026-06_nomina",
  },
  {
    id: "tx_expense_1",
    type: "expense",
    description: "Super",
    amount: 30000,
    category: "Food",
    date: "2026-06-05",
    timestamp: "2026-06-05T12:00:00.000Z",
    source: "manual",
    currency: "MXN",
    budgetConceptId: "concept_rent",
  },
  {
    id: "tx_expense_2",
    type: "expense",
    description: "Servicios",
    amount: 18676.87,
    category: "Home",
    date: "2026-06-10",
    timestamp: "2026-06-10T12:00:00.000Z",
    source: "manual",
    currency: "MXN",
    budgetConceptId: "concept_rent",
  },
];

const concepts: BudgetConcept[] = [
  {
    id: "concept_rent",
    name: "Renta",
    category: "Home",
    subcategory: "Renta",
    budgetedAmount: 50000,
    actualAmount: 99999,
    currency: "MXN",
    period,
    type: "expense",
    isFixed: true,
    isParent: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const committed = calcCommittedFromTransactions(concepts, transactions, period);
assert(committed === 1323.13, `committed from txs expected 1323.13, got ${committed}`);

const pending = listPendingPayments(concepts, transactions, period);
assert(pending.length === 1, `expected 1 pending item, got ${pending.length}`);
assert(pending[0].pending === 1323.13, `pending item amount expected 1323.13, got ${pending[0].pending}`);
assert(pending[0].originPeriod === period, "originPeriod should match concept period");

const priorTaxConcepts: BudgetConcept[] = [
  ...concepts,
  {
    id: "brain_2026-02_impuestos",
    name: "Impuestos",
    category: "Financial Services",
    subcategory: "Taxes",
    budgetedAmount: 3867,
    actualAmount: 0,
    currency: "MXN",
    period: "2026-02",
    type: "expense",
    isFixed: false,
    isParent: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "brain_2026-03_impuestos",
    name: "Impuestos",
    category: "Financial Services",
    subcategory: "Taxes",
    budgetedAmount: 2367,
    actualAmount: 0,
    currency: "MXN",
    period: "2026-03",
    type: "expense",
    isFixed: false,
    isParent: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

const carried = listPendingPayments(priorTaxConcepts, transactions, period);
assert(carried.length === 3, `expected 3 pending items with carry-forward, got ${carried.length}`);
assert(
  calcCommittedFromTransactions(priorTaxConcepts, transactions, period) === 7557.13,
  "committed should include prior-month tax arrears",
);

const priorOnly = carried.filter((item) => item.originPeriod !== period);
assert(priorOnly.length === 2, `expected 2 prior-month items, got ${priorOnly.length}`);
assert(
  priorOnly.reduce((sum, item) => sum + item.pending, 0) === 6234,
  "feb+mar impuestos should total 6234 pending",
);

const paymentInJune: EnhancedTransaction = {
  id: "tx_tax_feb",
  type: "expense",
  description: "Impuestos febrero",
  amount: 3867,
  category: "Financial Services",
  date: "2026-06-20",
  timestamp: "2026-06-20T12:00:00.000Z",
  source: "manual",
  currency: "MXN",
  budgetConceptId: "brain_2026-02_impuestos",
};

const afterPay = listPendingPayments(priorTaxConcepts, [...transactions, paymentInJune], period);
assert(
  afterPay.find((item) => item.conceptId === "brain_2026-02_impuestos") == null,
  "feb impuestos should clear after payment linked to feb concept",
);
assert(
  afterPay.find((item) => item.conceptId === "brain_2026-03_impuestos")?.pending === 2367,
  "mar impuestos should remain pending",
);

const metrics = buildPeriodMoneyMetrics({
  transactions,
  concepts,
  period,
  manualOverride: null,
});

assert(metrics.income === 77087, `income expected 77087, got ${metrics.income}`);
assert(metrics.spent === 48676.87, `spent expected 48676.87, got ${metrics.spent}`);
assert(
  Math.abs(metrics.income - metrics.spent - metrics.committed - metrics.disponible) < 0.02,
  `identity failed: ${metrics.income} != ${metrics.spent} + ${metrics.committed} + ${metrics.disponible}`,
);

console.log("OK period-math.test.ts");
