import type { EnhancedTransaction } from "./FinancialDatabase";
import { roundMoney, resolveAmountMxn } from "./period-math";

export interface AccountMovementSummary {
  inflows: number;
  outflows: number;
  net: number;
  txCount: number;
}

export interface AccountDefinition {
  id: string;
  bankId: string;
  name: string;
  type: "checking" | "savings" | "credit" | "debit" | "investment";
  currency: string;
  color: string;
  custom: boolean;
}

/** Master accounts for household finance. */
export const MASTER_ACCOUNTS: AccountDefinition[] = [
  { id: "acc_mercado_pago", bankId: "bank_mp", name: "Mercado Pago", type: "debit", currency: "MXN", color: "#009ee3", custom: false },
  { id: "acc_deel", bankId: "bank_deel", name: "Deel", type: "checking", currency: "MXN", color: "#5b21b6", custom: false },
  { id: "acc_bbva", bankId: "bank_bbva", name: "BBVA Bancomer", type: "checking", currency: "MXN", color: "#004481", custom: false },
  { id: "acc_hsbc", bankId: "bank_hsbc", name: "HSBC", type: "credit", currency: "MXN", color: "#db0011", custom: false },
];

export const MASTER_BANKS = [
  { id: "bank_mp", name: "Mercado Pago", code: "MP", color: "#009ee3", custom: false },
  { id: "bank_deel", name: "Deel", code: "DEEL", color: "#5b21b6", custom: false },
  { id: "bank_bbva", name: "BBVA", code: "BBVA", color: "#004481", custom: false },
  { id: "bank_hsbc", name: "HSBC", code: "HSBC", color: "#db0011", custom: false },
];

const ACCOUNT_NAME_ALIASES: Record<string, string> = {
  mp: "acc_mercado_pago",
  "mercado pago": "acc_mercado_pago",
  mercadopago: "acc_mercado_pago",
  deel: "acc_deel",
  bbva: "acc_bbva",
  bancomer: "acc_bbva",
  hsbc: "acc_hsbc",
};

export function resolveAccountIdFromName(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  const key = name.trim().toLowerCase();
  return ACCOUNT_NAME_ALIASES[key];
}

export function defaultAccountIdForTransaction(tx: EnhancedTransaction): string | undefined {
  if (tx.accountId) return tx.accountId;
  const fromNotes = resolveAccountIdFromName(tx.notes);
  if (fromNotes) return fromNotes;
  if (tx.source === "import") return "acc_mercado_pago";
  return undefined;
}

export function computeAccountMovements(
  transactions: EnhancedTransaction[],
  accountId: string,
  period?: string,
): AccountMovementSummary {
  let inflows = 0;
  let outflows = 0;
  let txCount = 0;

  for (const tx of transactions) {
    const txAccount = tx.accountId ?? defaultAccountIdForTransaction(tx);
    if (txAccount !== accountId) continue;
    if (period && !tx.date.startsWith(period)) continue;
    if (tx.type === "transfer") continue;

    const amount = resolveAmountMxn(tx);
    txCount += 1;
    if (tx.type === "income") inflows = roundMoney(inflows + amount);
    else if (tx.type === "expense") outflows = roundMoney(outflows + amount);
  }

  return {
    inflows,
    outflows,
    net: roundMoney(inflows - outflows),
    txCount,
  };
}

export function computeAccountBalance(
  openingBalance: number,
  transactions: EnhancedTransaction[],
  accountId: string,
  throughDate?: string,
): number {
  let balance = roundMoney(openingBalance);

  for (const tx of transactions) {
    const txAccount = tx.accountId ?? defaultAccountIdForTransaction(tx);
    if (txAccount !== accountId) continue;
    if (throughDate && tx.date > throughDate) continue;
    if (tx.type === "transfer") continue;

    const amount = resolveAmountMxn(tx);
    if (tx.type === "income") balance = roundMoney(balance + amount);
    else if (tx.type === "expense") balance = roundMoney(balance - amount);
  }

  return balance;
}

export function computeAllAccountBalances(
  transactions: EnhancedTransaction[],
  period: string,
): Array<{ accountId: string; name: string; summary: AccountMovementSummary }> {
  return MASTER_ACCOUNTS.map((acc) => ({
    accountId: acc.id,
    name: acc.name,
    summary: computeAccountMovements(transactions, acc.id, period),
  })).filter((row) => row.summary.txCount > 0);
}
