/**
 * Run: npx tsx scripts/account-balance.test.ts
 */
import {
  computeAccountMovements,
  computeAccountBalance,
} from "../src/features/finance/account-balance";
import type { EnhancedTransaction } from "../src/features/finance/FinancialDatabase";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const txs: EnhancedTransaction[] = [
  {
    id: "tx_in",
    type: "income",
    description: "Nómina",
    amount: 77087,
    category: "Ingresos",
    subcategory: "Nómina",
    date: "2026-06-01",
    timestamp: "2026-06-01T12:00:00.000Z",
    source: "manual",
    currency: "MXN",
    accountId: "acc_deel",
  },
  {
    id: "tx_out",
    type: "expense",
    description: "Uber Eats",
    amount: 350,
    category: "Alimentación",
    subcategory: "Delivery",
    date: "2026-06-30",
    timestamp: "2026-06-30T12:00:00.000Z",
    source: "import",
    currency: "MXN",
    accountId: "acc_mercado_pago",
  },
];

const mp = computeAccountMovements(txs, "acc_mercado_pago", "2026-06");
assert(mp.outflows === 350 && mp.inflows === 0, "MP outflows");
assert(mp.net === -350, "MP net");

const deel = computeAccountMovements(txs, "acc_deel", "2026-06");
assert(deel.inflows === 77087, "Deel inflows");

const balance = computeAccountBalance(1000, txs, "acc_mercado_pago", "2026-06-30");
assert(balance === 650, `balance expected 650, got ${balance}`);

console.log("OK account-balance.test.ts");
