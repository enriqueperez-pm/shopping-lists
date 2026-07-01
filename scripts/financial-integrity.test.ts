/**
 * Run: npx tsx scripts/financial-integrity.test.ts
 */
import { runFinancialIntegrityChecks } from "../src/features/finance/financial-integrity";
import type { FinancialPersistedData } from "../src/features/finance/FinancialDatabase";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const payload: FinancialPersistedData = {
  transactions: [
    {
      id: "tx_income",
      type: "income",
      description: "Nómina",
      amount: 10000,
      category: "Ingresos",
      subcategory: "Nómina",
      date: "2026-06-01",
      timestamp: "2026-06-01T12:00:00.000Z",
      source: "manual",
      currency: "MXN",
      budgetConceptId: "brain_2026-06_nomina",
    },
    {
      id: "tx_expense",
      type: "expense",
      description: "Super",
      amount: 3000,
      category: "Alimentación",
      subcategory: "Supermercado",
      date: "2026-06-05",
      timestamp: "2026-06-05T12:00:00.000Z",
      source: "manual",
      currency: "MXN",
      budgetConceptId: "brain_2026-06_despensa",
    },
  ],
  banks: [],
  accounts: [],
  categories: { income: [], expense: [] },
  budgets: {},
  debts: [],
  creditCards: [],
  amortizationSchedules: [],
  moduleData: {
    budgetConcepts: [
      {
        id: "brain_2026-06_nomina",
        name: "Nómina",
        category: "Ingresos",
        subcategory: "Nómina",
        budgetedAmount: 10000,
        actualAmount: 0,
        currency: "MXN",
        period: "2026-06",
        type: "income",
        isFixed: true,
        isParent: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "brain_2026-06_despensa",
        name: "Despensa",
        category: "Alimentación",
        subcategory: "Supermercado",
        budgetedAmount: 5000,
        actualAmount: 0,
        currency: "MXN",
        period: "2026-06",
        type: "expense",
        isFixed: false,
        isParent: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
  settings: {
    version: "3.0",
    created: "2026-06-01T00:00:00.000Z",
    lastUpdate: "2026-06-01T00:00:00.000Z",
    trackerConfig: { defaultCurrency: "MXN", usdToMxnRate: 17.9, monthStartDay: 1 },
  },
};

const report = runFinancialIntegrityChecks(payload);
assert(report.ok, `integrity should pass, issues: ${JSON.stringify(report.issues)}`);

console.log("OK financial-integrity.test.ts");
