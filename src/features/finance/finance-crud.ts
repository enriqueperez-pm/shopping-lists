import type { BudgetConcept } from "./types";
import type { EnhancedTransaction, FinancialDatabase } from "./FinancialDatabase";
import {
  applyConceptCategoryToTransaction,
  dedupeBudgetConceptsInDb,
  ensureCategoryPath,
  ensurePeriodConceptHierarchy,
  getBudgetConcepts,
  getParentConceptKey,
  normalizeValue,
  repairBudgetHierarchyInDb,
} from "./finance-linking";

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

const LEGACY_PAIR_MAP: Record<string, [string, string]> = {
  "Housing|Rent": ["Vivienda", "Renta"],
  "Housing|Electricity": ["Vivienda", "Luz"],
  "Housing|Utilities": ["Vivienda", "Agua"],
  "Housing|Gas": ["Vivienda", "Gas doméstico"],
  "Housing|Maintenance": ["Vivienda", "Mantenimiento"],
  "Housing|Internet": ["Vivienda", "Internet"],
  "Technology|Telmex": ["Vivienda", "Internet"],
  "Technology|Phone": ["Vivienda", "Teléfono móvil"],
  "Technology|Subscriptions": ["Tecnología", "Suscripciones"],
  "Technology|Software": ["Tecnología", "Software"],
  "Transport|Car": ["Transporte", "Auto"],
  "Transport|Gas": ["Transporte", "Gasolina"],
  "Food|Groceries": ["Alimentación", "Despensa"],
  "Food|Delivery": ["Alimentación", "Delivery"],
  "Food|Comida Brunas": ["Mascotas", "Comida Runa"],
  "Food|Restaurants": ["Alimentación", "Restaurantes"],
  "Entertainment|Streaming": ["Tecnología", "Suscripciones"],
  "Entretenimiento|Streaming": ["Tecnología", "Suscripciones"],
  "Financial Services|Taxes": ["Servicios financieros", "Impuestos"],
  "Financial Services|Debt Payment": ["Servicios financieros", "Pago de deuda"],
  "Financial Services|Commissions": ["Servicios financieros", "Comisiones"],
  "Personal|Miscellaneous": ["Personal", "Misceláneos"],
  "Other|Miscellaneous": ["Otros", "Misceláneos"],
  "Salary|Main Job": ["Ingresos", "Nómina"],
  "Freelance|Projects": ["Ingresos", "Freelance"],
};

function mapLegacyPair(category: string, subcategory: string): [string, string] | null {
  return LEGACY_PAIR_MAP[`${category}|${subcategory || ""}`] ?? null;
}

export function repairLegacyEnglishTaxonomy(db: FinancialDatabase): boolean {
  let changed = false;

  const concepts = getBudgetConcepts(db).map((c) => {
    const mapped = mapLegacyPair(c.category, c.subcategory || "");
    if (!mapped) return c;
    changed = true;
    return { ...c, category: mapped[0], subcategory: mapped[1], updatedAt: nowIso() };
  });
  if (changed) db.setModuleData("budgetConcepts", concepts);

  for (const tx of db.getTransactions()) {
    const mapped = mapLegacyPair(tx.category, tx.subcategory || "");
    if (!mapped) continue;
    if (db.updateTransaction(tx.id, { category: mapped[0], subcategory: mapped[1] })) {
      changed = true;
    }
  }

  if (changed) {
    dedupeBudgetConceptsInDb(db);
    repairBudgetHierarchyInDb(db);
  }
  return changed;
}

export function recordRecentConceptId(db: FinancialDatabase, conceptId: string) {
  const prefs = db.getUserPreferences();
  const recent = [conceptId, ...(prefs.recentConceptIds ?? []).filter((id) => id !== conceptId)].slice(0, 10);
  db.setUserPreferences({ ...prefs, recentConceptIds: recent });
}
