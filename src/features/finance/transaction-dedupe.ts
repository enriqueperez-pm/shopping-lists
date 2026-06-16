import type { EnhancedTransaction } from "./FinancialDatabase";

export function transactionFingerprint(tx: EnhancedTransaction): string {
  return [
    tx.date,
    tx.type,
    Number(tx.amount).toFixed(2),
    String(tx.description || "")
      .trim()
      .toLowerCase(),
    tx.budgetConceptId || "",
  ].join("|");
}

function transactionKeepScore(tx: EnhancedTransaction) {
  const brainIdx = tx.id?.match(/^brain_tx_\d{4}-\d{2}-\d{2}_(\d+)$/)?.[1];
  return {
    shopping: tx.source === "shopping_trip" ? 3 : 0,
    manual: tx.source !== "import" ? 2 : 0,
    brainIdx: brainIdx != null ? -Number(brainIdx) : 0,
    time: new Date(tx.timestamp || tx.date).getTime() || 0,
  };
}

function pickPreferredTransaction(
  a: EnhancedTransaction,
  b: EnhancedTransaction,
): EnhancedTransaction {
  const ar = transactionKeepScore(a);
  const br = transactionKeepScore(b);
  if (ar.shopping !== br.shopping) return ar.shopping > br.shopping ? a : b;
  if (ar.manual !== br.manual) return ar.manual > br.manual ? a : b;
  if (ar.brainIdx !== br.brainIdx) return ar.brainIdx > br.brainIdx ? a : b;
  return ar.time >= br.time ? a : b;
}

/** Colapsa movimientos idénticos (misma fecha, monto, concepto). */
export function dedupeTransactionFingerprints(
  transactions: EnhancedTransaction[],
): EnhancedTransaction[] {
  const byFingerprint = new Map<string, EnhancedTransaction>();
  for (const tx of transactions) {
    const key = transactionFingerprint(tx);
    const existing = byFingerprint.get(key);
    byFingerprint.set(key, existing ? pickPreferredTransaction(existing, tx) : tx);
  }
  return [...byFingerprint.values()];
}
