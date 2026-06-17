import type { EnhancedTransaction, FinancialPersistedData } from "../FinancialDatabase";
import { dedupeTransactionFingerprints } from "../transaction-dedupe";

type BudgetConcept = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  period: string;
  type: "income" | "expense";
  budgetedAmount?: number;
  actualAmount?: number;
  isFixed?: boolean;
  description?: string;
  parentId?: string;
  isParent?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function normalize(v: string | undefined): string {
  return String(v || "").trim().toLowerCase();
}

function leafConceptKey(c: BudgetConcept): string {
  return `${c.period}::${c.type}::${normalize(c.category)}::${normalize(c.subcategory || c.name)}`;
}

function dedupeBudgetConcepts(concepts: BudgetConcept[]): BudgetConcept[] {
  const parentKey = (period: string, type: string, category: string) =>
    `${period}::${type}::${normalize(category)}`;

  const pick = (a: BudgetConcept, b: BudgetConcept) => {
    const aBrain = a.id.startsWith("brain_");
    const bBrain = b.id.startsWith("brain_");
    if (aBrain && !bBrain) return a;
    if (bBrain && !aBrain) return b;
    return new Date(a.createdAt ?? 0).getTime() <= new Date(b.createdAt ?? 0).getTime() ? a : b;
  };

  const parentCanonical = new Map<string, BudgetConcept>();
  const parentIdRemap = new Map<string, string>();
  const leafCanonical = new Map<string, BudgetConcept>();
  const dropIds = new Set<string>();

  for (const concept of concepts) {
    if (!concept.isParent || concept.parentId) continue;
    const key = parentKey(concept.period, concept.type, concept.category);
    const existing = parentCanonical.get(key);
    if (!existing) {
      parentCanonical.set(key, concept);
      continue;
    }
    const keep = pick(existing, concept);
    const drop = keep.id === existing.id ? concept : existing;
    parentCanonical.set(key, keep);
    parentIdRemap.set(drop.id, keep.id);
    dropIds.add(drop.id);
  }

  for (const concept of concepts) {
    if (concept.isParent) continue;
    const key = leafConceptKey(concept);
    const existing = leafCanonical.get(key);
    if (!existing) {
      leafCanonical.set(key, concept);
      continue;
    }
    const keep = pick(existing, concept);
    const drop = keep.id === existing.id ? concept : existing;
    keep.budgetedAmount = Math.max(keep.budgetedAmount || 0, drop.budgetedAmount || 0);
    keep.actualAmount = Math.max(keep.actualAmount || 0, drop.actualAmount || 0);
    leafCanonical.set(key, keep);
    parentIdRemap.set(drop.id, keep.id);
    dropIds.add(drop.id);
  }

  return concepts
    .filter((concept) => !dropIds.has(concept.id))
    .map((concept) => {
      if (concept.isParent) return concept;
      const parentId = concept.parentId
        ? parentIdRemap.get(concept.parentId) ?? concept.parentId
        : undefined;
      return parentId && parentId !== concept.parentId ? { ...concept, parentId } : concept;
    });
}

function mergeBudgetConcepts(
  brainConcepts: BudgetConcept[],
  remoteConcepts: BudgetConcept[],
  brainPeriods: Set<string>,
): BudgetConcept[] {
  const remoteById = new Map(remoteConcepts.map((c) => [c.id, c]));
  const remoteByLeaf = new Map<string, BudgetConcept>();
  for (const c of remoteConcepts) {
    if (!c.isParent) remoteByLeaf.set(leafConceptKey(c), c);
  }

  const keptRemote = remoteConcepts.filter((c) => !brainPeriods.has(c.period));
  const mergedBrainPeriod: BudgetConcept[] = [];
  const consumedRemote = new Set<string>();

  for (const bc of brainConcepts) {
    if (!brainPeriods.has(bc.period)) continue;
    const remote =
      remoteById.get(bc.id) || (!bc.isParent ? remoteByLeaf.get(leafConceptKey(bc)) : undefined);
    if (remote) {
      const brainManaged = bc.id.startsWith("brain_");
      mergedBrainPeriod.push({
        ...bc,
        budgetedAmount: brainManaged
          ? (bc.budgetedAmount ?? remote.budgetedAmount)
          : (remote.budgetedAmount ?? bc.budgetedAmount),
        actualAmount: brainManaged
          ? (bc.actualAmount ?? 0)
          : Math.max(remote.actualAmount ?? 0, bc.actualAmount ?? 0),
        isFixed: brainManaged ? bc.isFixed : (remote.isFixed ?? bc.isFixed),
        description: brainManaged ? bc.description : remote.description || bc.description,
        updatedAt: remote.updatedAt || bc.updatedAt,
      });
      consumedRemote.add(remote.id);
    } else {
      mergedBrainPeriod.push(bc);
    }
  }

  for (const rc of remoteConcepts) {
    if (!brainPeriods.has(rc.period)) continue;
    if (consumedRemote.has(rc.id)) continue;
    if (mergedBrainPeriod.some((c) => c.id === rc.id)) continue;
    mergedBrainPeriod.push(rc);
  }

  return dedupeBudgetConcepts([...keptRemote, ...mergedBrainPeriod]);
}

function txRank(tx: EnhancedTransaction) {
  const manual = tx.source !== "import" ? 1 : 0;
  const time = new Date(tx.timestamp || tx.date).getTime();
  return { manual, time: Number.isFinite(time) ? time : 0 };
}

function dedupeMonthlyIncomeTx(transactions: EnhancedTransaction[]): EnhancedTransaction[] {
  const byPeriod = new Map<string, EnhancedTransaction[]>();
  const rest: EnhancedTransaction[] = [];

  for (const tx of transactions) {
    if (tx.type !== "income") {
      rest.push(tx);
      continue;
    }
    const period = (tx.date || "").slice(0, 7);
    if (!period) {
      rest.push(tx);
      continue;
    }
    const list = byPeriod.get(period) ?? [];
    list.push(tx);
    byPeriod.set(period, list);
  }

  const income: EnhancedTransaction[] = [];
  for (const list of byPeriod.values()) {
    list.sort((a, b) => {
      const ar = txRank(a);
      const br = txRank(b);
      if (ar.manual !== br.manual) return br.manual - ar.manual;
      return br.time - ar.time;
    });
    income.push(list[0]);
  }

  return [...rest, ...income];
}

function mergeTransactions(
  brainTx: EnhancedTransaction[],
  remoteTx: EnhancedTransaction[],
  brainPeriods: Set<string>,
): EnhancedTransaction[] {
  const byId = new Map<string, EnhancedTransaction>();
  const add = (tx: EnhancedTransaction) => {
    if (!tx?.id) return;
    byId.set(tx.id, tx);
  };

  const brainIds = new Set(brainTx.map((tx) => tx.id));

  for (const tx of remoteTx) {
    if (tx.source === "shopping_trip") add(tx);
  }

  for (const tx of remoteTx) {
    if (tx.source === "shopping_trip") continue;
    const period = (tx.date || "").slice(0, 7);
    if (brainPeriods.has(period)) continue;
    add(tx);
  }

  for (const tx of brainTx) {
    add(tx);
  }

  for (const tx of remoteTx) {
    if (tx.source === "shopping_trip") continue;
    const period = (tx.date || "").slice(0, 7);
    if (!brainPeriods.has(period)) continue;
    if (brainIds.has(tx.id)) continue;
    if (tx.id?.startsWith("brain_tx_")) continue;
    add(tx);
  }

  return dedupeMonthlyIncomeTx(dedupeTransactionFingerprints([...byId.values()])).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Fusiona payload del brain con el estado remoto de la app/nube. */
export function mergeBrainWithRemote(
  brainPayload: FinancialPersistedData,
  remotePayload: FinancialPersistedData | null | undefined,
): FinancialPersistedData {
  if (!remotePayload || typeof remotePayload !== "object") {
    return brainPayload;
  }

  const brainPeriods = new Set(
    ((brainPayload.moduleData?.budgetConcepts ?? []) as BudgetConcept[])
      .filter((c) => !c.isParent)
      .map((c) => c.period),
  );

  const brainTx = brainPayload.transactions ?? [];
  const remoteTx = remotePayload.transactions ?? [];

  return {
    ...brainPayload,
    transactions: mergeTransactions(brainTx, remoteTx, brainPeriods),
    moduleData: {
      ...brainPayload.moduleData,
      ...remotePayload.moduleData,
      budgetConcepts: mergeBudgetConcepts(
        (brainPayload.moduleData?.budgetConcepts ?? []) as BudgetConcept[],
        (remotePayload.moduleData?.budgetConcepts ?? []) as BudgetConcept[],
        brainPeriods,
      ),
      categoriesTree:
        (brainPayload.moduleData?.categoriesTree?.length
          ? brainPayload.moduleData.categoriesTree
          : remotePayload.moduleData?.categoriesTree) ?? [],
      budgetCategoryOrder:
        remotePayload.moduleData?.budgetCategoryOrder ??
        brainPayload.moduleData?.budgetCategoryOrder ??
        {},
      budgetConceptOrder:
        remotePayload.moduleData?.budgetConceptOrder ??
        brainPayload.moduleData?.budgetConceptOrder ??
        {},
      userPreferences: {
        ...(brainPayload.moduleData?.userPreferences ?? {}),
        ...(remotePayload.moduleData?.userPreferences ?? {}),
      },
    },
    banks: remotePayload.banks?.length ? remotePayload.banks : brainPayload.banks,
    accounts: remotePayload.accounts?.length ? remotePayload.accounts : brainPayload.accounts,
    settings: {
      ...(brainPayload.settings ?? {}),
      ...(remotePayload.settings ?? {}),
    },
  };
}
