import type { FinancialPersistedData } from "./FinancialDatabase";
import { mergeBrainWithRemote } from "./brain-sync/mergeBrainWithRemote";
import { mergeFinancialPayloads } from "./financialPayloadMerge";
import { dedupeTransactionFingerprints } from "./transaction-dedupe";

/** Fusiona snapshot brain + payload nube + estado local (sin perder ediciones recientes). */
export function reconcileFinancialState(
  local: FinancialPersistedData,
  remotePayload: FinancialPersistedData | null | undefined,
  brainSnapshot: FinancialPersistedData | null | undefined,
): FinancialPersistedData {
  let cloud = remotePayload ?? null;
  if (brainSnapshot) {
    cloud = mergeBrainWithRemote(brainSnapshot, cloud ?? undefined);
  }
  if (!cloud) {
    return {
      ...local,
      transactions: dedupeTransactionFingerprints(local.transactions ?? []),
    };
  }
  const merged = mergeFinancialPayloads(local, cloud);
  return {
    ...merged,
    transactions: dedupeTransactionFingerprints(merged.transactions ?? []),
  };
}

export function payloadsEqual(a: FinancialPersistedData, b: FinancialPersistedData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
