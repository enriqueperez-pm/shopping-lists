/**
 * Run: npx tsx scripts/movements-table.test.ts
 */
import {
  computeMovementAggregates,
  groupMovementsByCategory,
  sortMovements,
} from "../src/features/finance/components/movements-table-utils";
import type { EnhancedTransaction } from "../src/features/finance/FinancialDatabase";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const txs: EnhancedTransaction[] = [
  {
    id: "1",
    type: "expense",
    description: "OXXO",
    amount: 112,
    category: "Alimentación",
    subcategory: "Tienda",
    date: "2026-07-01",
    timestamp: "2026-07-01T12:00:00.000Z",
    source: "import",
    currency: "MXN",
  },
  {
    id: "2",
    type: "expense",
    description: "Uber Eats",
    amount: 350,
    category: "Alimentación",
    subcategory: "Delivery",
    date: "2026-06-30",
    timestamp: "2026-06-30T12:00:00.000Z",
    source: "import",
    currency: "MXN",
  },
  {
    id: "3",
    type: "income",
    description: "Nómina",
    amount: 77087,
    category: "Ingresos",
    subcategory: "Nómina",
    date: "2026-06-01",
    timestamp: "2026-06-01T12:00:00.000Z",
    source: "manual",
    currency: "MXN",
  },
];

const agg = computeMovementAggregates(txs);
assert(agg.count === 3, `count expected 3, got ${agg.count}`);
assert(agg.expenseTotal === 462, `expense expected 462, got ${agg.expenseTotal}`);
assert(agg.incomeTotal === 77087, `income expected 77087, got ${agg.incomeTotal}`);
assert(agg.net === 76625, `net expected 76625, got ${agg.net}`);

const sorted = sortMovements(txs, "date", "desc");
assert(sorted[0].id === "1", "newest date first");

const groups = groupMovementsByCategory(txs);
assert(groups.length === 2, `expected 2 category groups, got ${groups.length}`);
assert(
  groups.find((g) => g.category === "Alimentación")?.subtotal.expenseTotal === 462,
  "alimentación subtotal",
);

console.log("OK movements-table.test.ts");
