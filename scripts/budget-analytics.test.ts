/**
 * Run: npx tsx scripts/budget-analytics.test.ts
 */
import { buildBudgetAnalytics } from "../src/features/finance/budget-analytics";
import type { EnhancedTransaction } from "../src/features/finance/FinancialDatabase";
import type { BudgetConcept } from "../src/features/finance/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const period = "2026-06";
const conceptId = "brain_2026-06_uber-eats";

const concepts: BudgetConcept[] = [
  {
    id: conceptId,
    name: "Uber Eats",
    category: "Alimentación",
    subcategory: "Delivery",
    budgetedAmount: 1500,
    actualAmount: 9999,
    currency: "MXN",
    period,
    type: "expense",
    isFixed: false,
    isParent: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

const transactions: EnhancedTransaction[] = [
  {
    id: "tx1",
    type: "expense",
    description: "Uber Eats",
    amount: 350,
    category: "Alimentación",
    subcategory: "Delivery",
    date: "2026-06-30",
    timestamp: "2026-06-30T12:00:00.000Z",
    source: "import",
    currency: "MXN",
    budgetConceptId: conceptId,
  },
  {
    id: "tx2",
    type: "expense",
    description: "Uber Eats",
    amount: 200,
    category: "Alimentación",
    subcategory: "Delivery",
    date: "2026-07-01",
    timestamp: "2026-07-01T12:00:00.000Z",
    source: "import",
    currency: "MXN",
    budgetConceptId: conceptId,
  },
];

const analytics = buildBudgetAnalytics({ concepts, transactions, selectedPeriod: period });
const analysis = analytics.leafAnalyses[0];
assert(analysis.actual === 550, `actual from txs expected 550, got ${analysis.actual}`);
assert(analysis.actual !== 9999, "should not use stored actualAmount");

console.log("OK budget-analytics.test.ts");
