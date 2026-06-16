/**
 * Verifica que mergeBrainWithRemote conserve ingreso manual $77,089 sobre import $45,000.
 * Ejecutar: npx tsx scripts/test-brain-merge.ts
 */
import { mergeBrainWithRemote } from "../src/features/finance/brain-sync/mergeBrainWithRemote";
import type { FinancialPersistedData } from "../src/features/finance/FinancialDatabase";

const brainPayload: FinancialPersistedData = {
  transactions: [
    {
      id: "brain_tx_2026-06-01_0",
      type: "income",
      description: "Nómina principal",
      amount: 77089,
      category: "Salary",
      subcategory: "Main Job",
      date: "2026-06-01",
      timestamp: "2026-06-01T12:00:00.000Z",
      source: "manual",
      currency: "MXN",
      budgetConceptId: "brain_2026-06_nomina",
    },
  ],
  moduleData: {
    budgetConcepts: [
      {
        id: "brain_2026-06_nomina",
        name: "Nómina principal",
        category: "Salary",
        subcategory: "Main Job",
        budgetedAmount: 77089,
        actualAmount: 77089,
        currency: "MXN",
        period: "2026-06",
        type: "income",
        isFixed: true,
        description: "estado=recibido",
        isParent: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
};

const remotePayload: FinancialPersistedData = {
  transactions: [
    {
      id: "remote_tx_old",
      type: "income",
      description: "Nómina principal",
      amount: 45000,
      category: "Salary",
      subcategory: "Main Job",
      date: "2026-06-05",
      timestamp: "2026-06-05T12:00:00.000Z",
      source: "import",
      currency: "MXN",
      budgetConceptId: "brain_2026-06_nomina",
    },
  ],
  moduleData: {
    budgetConcepts: [],
  },
};

const merged = mergeBrainWithRemote(brainPayload, remotePayload);
const juneIncome = merged.transactions.filter(
  (tx) => tx.type === "income" && tx.date.startsWith("2026-06"),
);

if (juneIncome.length !== 1) {
  console.error("FAIL: expected 1 income tx for 2026-06, got", juneIncome.length);
  process.exit(1);
}

const tx = juneIncome[0];
if (tx.amount !== 77089 || tx.source !== "manual") {
  console.error("FAIL: expected manual 77089, got", tx);
  process.exit(1);
}

console.log("OK: mergeBrainWithRemote keeps manual $77,089 for June");
