import type { BudgetConcept } from "./types";
import type { EnhancedTransaction, FinancialDatabase } from "./FinancialDatabase";
import {
  applyConceptCategoryToTransaction,
  dedupeBudgetConceptsInDb,
  ensureCategoryPath,
  ensurePeriodConceptHierarchy,
  getBudgetConcepts,
  getParentConceptKey,
  repairBudgetHierarchyInDb,
  resolveBudgetConceptId,
} from "./finance-linking";
import { canonicalConceptKey } from "./budget-concept-keys";
import {
  buildCategoriesTreeFromSeed,
  resolveCanonicalPair,
} from "./taxonomy-canonical";
import { actualByConceptFromAllTransactions } from "./period-math";

export type LinkReviewStatus = "pending" | "confirmed" | "incorrect";

const nowIso = () => new Date().toISOString();
const createConceptId = () => `concept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function findOrCreateParentConcept(
  concepts: BudgetConcept[],
  period: string,
  type: "income" | "expense",
  category: string,
  defaultCurrency: BudgetConcept["currency"],
): { concepts: BudgetConcept[]; parent: BudgetConcept } {
  const key = getParentConceptKey(type, category);
  const existing = concepts.find(
    (row) =>
      row.isParent &&
      row.period === period &&
      !row.parentId &&
      getParentConceptKey(row.type, row.category) === key,
  );
  if (existing) return { concepts, parent: existing };

  const parent: BudgetConcept = {
    id: createConceptId(),
    name: category,
    category,
    budgetedAmount: 0,
    actualAmount: 0,
    currency: defaultCurrency,
    period,
    type,
    isFixed: false,
    description: `Parent ${category}`,
    isParent: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return { concepts: [...concepts, parent], parent };
}

export function conceptOrderKey(period: string, type: "income" | "expense", parentId: string) {
  return `${period}:${type}:${parentId}`;
}

export function getBudgetConceptOrder(
  db: FinancialDatabase,
  period: string,
  type: "income" | "expense",
  parentId: string,
): string[] {
  return db.getBudgetConceptOrderMap()[conceptOrderKey(period, type, parentId)] ?? [];
}

export function setBudgetConceptOrder(
  db: FinancialDatabase,
  period: string,
  type: "income" | "expense",
  parentId: string,
  order: string[],
) {
  const all = { ...db.getBudgetConceptOrderMap() };
  all[conceptOrderKey(period, type, parentId)] = order;
  db.setBudgetConceptOrderMap(all);
}

export function sortConceptsByOrder(concepts: BudgetConcept[], order: string[]): BudgetConcept[] {
  if (!order.length) return [...concepts].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...concepts].sort((a, b) => {
    const ar = rank.get(a.id);
    const br = rank.get(b.id);
    if (ar != null && br != null) return ar - br;
    if (ar != null) return -1;
    if (br != null) return 1;
    return a.name.localeCompare(b.name, "es");
  });
}

export function getTransactionsForConcept(
  transactions: EnhancedTransaction[],
  conceptId: string,
): EnhancedTransaction[] {
  return transactions
    .filter((tx) => tx.budgetConceptId === conceptId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function setTransactionLinkReview(
  db: FinancialDatabase,
  txId: string,
  status: LinkReviewStatus,
  options?: { suggestedConceptId?: string },
): boolean {
  const tx = db.getTransactions().find((t) => t.id === txId);
  if (!tx) return false;

  const updates: Partial<EnhancedTransaction> = {
    linkReviewStatus: status,
    linkReviewedAt: nowIso(),
    suggestedConceptId: options?.suggestedConceptId,
  };

  if (status === "confirmed") {
    updates.suggestedConceptId = undefined;
  }

  if (status === "incorrect" && options?.suggestedConceptId) {
    const concept = getBudgetConcepts(db).find((c) => c.id === options.suggestedConceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: tx.type === "income" ? "income" : "expense",
      budgetConceptId: options.suggestedConceptId,
      category: concept?.category ?? tx.category,
      subcategory: concept?.subcategory ?? tx.subcategory,
    });
    updates.budgetConceptId = options.suggestedConceptId;
    updates.category = cats.category ?? tx.category;
    updates.subcategory = cats.subcategory;
    updates.linkReviewStatus = "confirmed";
  }

  return db.updateTransaction(txId, updates);
}

export function countLinkReviewPending(transactions: EnhancedTransaction[], conceptId?: string): number {
  return transactions.filter((tx) => {
    if (conceptId && tx.budgetConceptId !== conceptId) return false;
    return !tx.linkReviewStatus || tx.linkReviewStatus === "pending";
  }).length;
}

export function updateBudgetConcept(
  db: FinancialDatabase,
  id: string,
  patch: Partial<
    Pick<BudgetConcept, "name" | "category" | "subcategory" | "budgetedAmount" | "isFixed" | "description">
  >,
): BudgetConcept | null {
  let concepts = getBudgetConcepts(db);
  const idx = concepts.findIndex((c) => c.id === id && !c.isParent);
  if (idx === -1) return null;

  const current = concepts[idx];
  const category = (patch.category ?? current.category).trim();
  const subcategory = patch.subcategory !== undefined ? patch.subcategory?.trim() || undefined : current.subcategory;
  const name = (patch.name ?? current.name).trim();

  ensureCategoryPath(db, { type: current.type, category, subcategory });
  ensurePeriodConceptHierarchy(db, current.period);
  concepts = getBudgetConcepts(db);
  const i = concepts.findIndex((c) => c.id === id);
  if (i === -1) return null;

  const parentResult = findOrCreateParentConcept(
    concepts.filter((c) => c.id !== id || !c.isParent),
    current.period,
    current.type,
    category,
    current.currency,
  );
  concepts = parentResult.concepts;

  const updated: BudgetConcept = {
    ...concepts.find((c) => c.id === id)!,
    ...patch,
    name,
    category,
    subcategory,
    parentId: parentResult.parent.id,
    updatedAt: nowIso(),
  };

  db.setModuleData(
    "budgetConcepts",
    concepts.map((c) => (c.id === id ? updated : c)),
  );
  repairBudgetHierarchyInDb(db, current.period);
  return updated;
}

export function deleteBudgetConcept(db: FinancialDatabase, id: string): boolean {
  const concepts = getBudgetConcepts(db);
  const target = concepts.find((c) => c.id === id && !c.isParent);
  if (!target) return false;

  for (const tx of db.getTransactions()) {
    if (tx.budgetConceptId === id) {
      db.updateTransaction(tx.id, { budgetConceptId: undefined, linkReviewStatus: "pending" });
    }
  }

  db.setModuleData("budgetConcepts", concepts.filter((c) => c.id !== id));
  return true;
}

export function duplicateBudgetConcept(
  db: FinancialDatabase,
  id: string,
  overrides?: Partial<Pick<BudgetConcept, "name" | "budgetedAmount" | "period">>,
): BudgetConcept | null {
  const src = getBudgetConcepts(db).find((c) => c.id === id && !c.isParent);
  if (!src) return null;

  let concepts = getBudgetConcepts(db);
  const period = overrides?.period ?? src.period;
  const parentResult = findOrCreateParentConcept(concepts, period, src.type, src.category, src.currency);
  concepts = parentResult.concepts;

  const copy: BudgetConcept = {
    ...src,
    id: createConceptId(),
    name: overrides?.name ?? `${src.name} (copia)`,
    budgetedAmount: overrides?.budgetedAmount ?? src.budgetedAmount,
    actualAmount: 0,
    period,
    parentId: parentResult.parent.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.setModuleData("budgetConcepts", [...concepts, copy]);
  return copy;
}

export function moveConceptToCategory(
  db: FinancialDatabase,
  conceptId: string,
  targetCategory: string,
  targetSubcategory?: string,
): boolean {
  return Boolean(updateBudgetConcept(db, conceptId, { category: targetCategory, subcategory: targetSubcategory }));
}

export interface EnforceCanonicalResult {
  conceptsRemapped: number;
  transactionsRemapped: number;
  conceptsRemoved: number;
  transactionsMarkedIncorrect: number;
}

export function enforceCanonicalTaxonomy(db: FinancialDatabase): EnforceCanonicalResult {
  const result: EnforceCanonicalResult = {
    conceptsRemapped: 0,
    transactionsRemapped: 0,
    conceptsRemoved: 0,
    transactionsMarkedIncorrect: 0,
  };

  let concepts = getBudgetConcepts(db).map((c) => {
    if (c.isParent) return c;
    const mapped = resolveCanonicalPair(c.type, c.category, c.subcategory || "");
    if (!mapped) return c;
    if (mapped.category === c.category && mapped.subcategory === (c.subcategory || "")) return c;
    result.conceptsRemapped += 1;
    return { ...c, category: mapped.category, subcategory: mapped.subcategory, updatedAt: nowIso() };
  });
  db.setModuleData("budgetConcepts", concepts);

  for (const tx of db.getTransactions()) {
    if (tx.type !== "income" && tx.type !== "expense") continue;
    const txType = tx.type === "income" ? "income" : "expense";
    const mapped = resolveCanonicalPair(txType, tx.category, tx.subcategory || "");
    if (!mapped) {
      db.updateTransaction(tx.id, { linkReviewStatus: "incorrect" });
      result.transactionsMarkedIncorrect += 1;
      continue;
    }
    if (mapped.category === tx.category && mapped.subcategory === (tx.subcategory || "")) continue;
    if (db.updateTransaction(tx.id, { category: mapped.category, subcategory: mapped.subcategory })) {
      result.transactionsRemapped += 1;
    }
  }

  dedupeBudgetConceptsInDb(db);
  repairBudgetHierarchyInDb(db);

  concepts = getBudgetConcepts(db);
  const txs = db.getTransactions();
  const txCountByConcept = new Map<string, number>();
  for (const tx of txs) {
    if (!tx.budgetConceptId) continue;
    txCountByConcept.set(tx.budgetConceptId, (txCountByConcept.get(tx.budgetConceptId) ?? 0) + 1);
  }

  const brainKeys = new Set<string>();
  for (const c of concepts) {
    if (c.isParent || !c.id.startsWith("brain_")) continue;
    brainKeys.add(`${c.period}::${c.type}::${canonicalConceptKey(c)}`);
  }

  const toRemove = new Set<string>();
  for (const c of concepts) {
    if (c.isParent) continue;
    const key = `${c.period}::${c.type}::${canonicalConceptKey(c)}`;
    const isAppOrphan =
      (c.id.startsWith("concept_") || c.id.includes("app-")) &&
      (txCountByConcept.get(c.id) ?? 0) === 0;
    const isDuplicateOfBrain =
      !c.id.startsWith("brain_") && brainKeys.has(key) && (txCountByConcept.get(c.id) ?? 0) === 0;
    if (isAppOrphan || isDuplicateOfBrain) toRemove.add(c.id);
  }

  if (toRemove.size > 0) {
    db.setModuleData(
      "budgetConcepts",
      concepts.filter((c) => !toRemove.has(c.id)),
    );
    result.conceptsRemoved = toRemove.size;
  }

  db.setModuleData("categoriesTree", buildCategoriesTreeFromSeed());
  return result;
}

export function repairLegacyEnglishTaxonomy(db: FinancialDatabase): boolean {
  const r = enforceCanonicalTaxonomy(db);
  return r.conceptsRemapped + r.transactionsRemapped + r.conceptsRemoved > 0;
}

/** Sincroniza actualAmount en conceptos desde transacciones (cache derivada). */
export function syncActualAmountsFromTransactions(
  db: FinancialDatabase,
): number {
  const concepts = getBudgetConcepts(db);
  const actualByConcept = actualByConceptFromAllTransactions(db.getTransactions());
  let updated = 0;
  const next = concepts.map((c) => {
    if (c.isParent) return c;
    const actual = actualByConcept.get(c.id) ?? 0;
    if (c.actualAmount === actual) return c;
    updated += 1;
    return { ...c, actualAmount: actual, updatedAt: nowIso() };
  });
  if (updated > 0) db.setModuleData("budgetConcepts", next);
  return updated;
}

export function bulkAssignCategory(
  db: FinancialDatabase,
  txIds: string[],
  category: string,
  subcategory: string,
): number {
  let count = 0;
  for (const id of txIds) {
    const tx = db.getTransactions().find((t) => t.id === id);
    if (!tx || (tx.type !== "income" && tx.type !== "expense")) continue;
    const txType = tx.type === "income" ? "income" : "expense";
    const period = tx.date.slice(0, 7);
    const conceptId = resolveBudgetConceptId(db, period, txType, category, subcategory);

    if (
      db.updateTransaction(id, {
        category,
        subcategory,
        budgetConceptId: conceptId,
        linkReviewStatus: conceptId ? "confirmed" : "pending",
      })
    ) {
      count += 1;
    }
  }
  return count;
}

export function bulkAssignConcept(
  db: FinancialDatabase,
  txIds: string[],
  conceptId: string,
): number {
  const concept = getBudgetConcepts(db).find((c) => c.id === conceptId && !c.isParent);
  if (!concept) return 0;

  let count = 0;
  for (const id of txIds) {
    const tx = db.getTransactions().find((t) => t.id === id);
    if (!tx) continue;
    const txType = tx.type === "income" ? "income" : "expense";
    if (txType !== concept.type) continue;

    const cats = applyConceptCategoryToTransaction(db, {
      type: txType,
      budgetConceptId: conceptId,
      category: concept.category,
      subcategory: concept.subcategory,
    });

    if (
      db.updateTransaction(id, {
        budgetConceptId: conceptId,
        category: cats.category ?? tx.category,
        subcategory: cats.subcategory,
        linkReviewStatus: "pending",
      })
    ) {
      count += 1;
    }
  }

  if (count > 0) recordRecentConceptId(db, conceptId);
  return count;
}

export function bulkConfirmLink(db: FinancialDatabase, txIds: string[]): number {
  let count = 0;
  for (const id of txIds) {
    const tx = db.getTransactions().find((t) => t.id === id);
    if (!tx?.budgetConceptId) continue;
    if (setTransactionLinkReview(db, id, "confirmed")) count += 1;
  }
  return count;
}

export function recordRecentConceptId(db: FinancialDatabase, conceptId: string) {
  const prefs = db.getUserPreferences();
  const recent = [conceptId, ...(prefs.recentConceptIds ?? []).filter((id) => id !== conceptId)].slice(0, 10);
  db.setUserPreferences({ ...prefs, recentConceptIds: recent });
}

/** Fusiona duplicados del periodo y remapea transacciones. Devuelve cuántos conceptos se eliminaron. */
export function cleanupDuplicateConcepts(db: FinancialDatabase, period?: string): number {
  const countLeaves = (list: BudgetConcept[]) =>
    list.filter((c) => !c.isParent && (!period || c.period === period)).length;
  const before = countLeaves(getBudgetConcepts(db));
  repairBudgetHierarchyInDb(db, period);
  const after = countLeaves(getBudgetConcepts(db));
  return Math.max(0, before - after);
}
