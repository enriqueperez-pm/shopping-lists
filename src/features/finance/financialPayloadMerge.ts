import type { EnhancedTransaction, FinancialPersistedData } from "./FinancialDatabase";
import { dedupeTransactionFingerprints } from "./transaction-dedupe";

type BudgetConcept = {
  id: string;
  name?: string;
  category?: string;
  subcategory?: string;
  period?: string;
  type?: string;
  isParent?: boolean;
  budgetedAmount?: number;
  actualAmount?: number;
  updatedAt?: string;
  createdAt?: string;
  parentId?: string;
  description?: string;
  isFixed?: boolean;
};

function txTime(tx: EnhancedTransaction): number {
  const raw = tx.timestamp || tx.date;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function conceptTime(c: BudgetConcept & { updatedAt?: string; createdAt?: string }): number {
  const raw = c.updatedAt || c.createdAt;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function incomePeriodKey(tx: EnhancedTransaction): string {
  return (tx.date || "").slice(0, 7);
}

/** Resuelve duplicados de ingreso del mismo mes: gana edición manual/reciente. */
function dedupeMonthlyIncome(transactions: EnhancedTransaction[]): EnhancedTransaction[] {
  const byPeriod = new Map<string, EnhancedTransaction[]>();
  for (const tx of transactions) {
    if (tx.type !== "income") continue;
    const period = incomePeriodKey(tx);
    if (!period) continue;
    const list = byPeriod.get(period) ?? [];
    list.push(tx);
    byPeriod.set(period, list);
  }

  const dropIds = new Set<string>();
  for (const list of byPeriod.values()) {
    if (list.length <= 1) continue;
    list.sort((a, b) => {
      const aManual = a.source !== "import" ? 1 : 0;
      const bManual = b.source !== "import" ? 1 : 0;
      if (aManual !== bManual) return bManual - aManual;
      return txTime(b) - txTime(a);
    });
    for (const tx of list.slice(1)) dropIds.add(tx.id);
  }

  if (!dropIds.size) return transactions;
  return transactions.filter((tx) => !dropIds.has(tx.id));
}

export function mergeTransactions(
  local: EnhancedTransaction[],
  remote: EnhancedTransaction[],
): EnhancedTransaction[] {
  const byId = new Map<string, EnhancedTransaction>();

  for (const tx of remote) {
    if (tx?.id) byId.set(tx.id, tx);
  }

  for (const tx of local) {
    if (!tx?.id) continue;
    const existing = byId.get(tx.id);
    if (!existing) {
      byId.set(tx.id, tx);
      continue;
    }
    if (txTime(tx) >= txTime(existing)) byId.set(tx.id, tx);
  }

  return dedupeMonthlyIncome(
    dedupeTransactionFingerprints(
      [...byId.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    ),
  );
}

function conceptKey(c: BudgetConcept) {
  if (c.isParent) {
    return `parent::${c.period}::${c.type}::${normalize(c.category)}`;
  }
  return `${c.period}::${c.type}::${normalize(c.category)}::${normalize(c.subcategory)}::${normalize(c.name)}`;
}

export function mergeBudgetConcepts(
  local: BudgetConcept[],
  remote: BudgetConcept[],
): BudgetConcept[] {
  const byId = new Map<string, BudgetConcept>();
  const byKey = new Map<string, BudgetConcept>();

  const register = (c: BudgetConcept) => {
    if (!c?.id) return;
    byId.set(c.id, c);
    byKey.set(conceptKey(c), c);
  };

  for (const c of remote) register(c);

  for (const c of local) {
    if (!c?.id) continue;
    const existingById = byId.get(c.id);
    const existingByKey = byKey.get(conceptKey(c));
    const existing = existingById ?? existingByKey;

    if (!existing) {
      register(c);
      continue;
    }

    const merged =
      conceptTime(c) >= conceptTime(existing)
        ? { ...existing, ...c, id: existing.id }
        : { ...c, ...existing, id: existing.id };

    byId.set(existing.id, merged);
    byKey.set(conceptKey(merged), merged);
  }

  return [...byId.values()];
}

/** Fusiona local + remoto sin perder ediciones recientes hechas en la app. */
export function mergeFinancialPayloads(
  local: FinancialPersistedData,
  remote: FinancialPersistedData,
): FinancialPersistedData {
  const localModule = local.moduleData ?? {};
  const remoteModule = remote.moduleData ?? {};

  return {
    ...remote,
    ...local,
    transactions: mergeTransactions(local.transactions ?? [], remote.transactions ?? []),
    moduleData: {
      ...remoteModule,
      ...localModule,
      budgetConcepts: mergeBudgetConcepts(
        (localModule.budgetConcepts ?? []) as BudgetConcept[],
        (remoteModule.budgetConcepts ?? []) as BudgetConcept[],
      ),
      categoriesTree:
        (remoteModule.categoriesTree?.length ? remoteModule.categoriesTree : localModule.categoriesTree) ??
        [],
      budgetCategoryOrder:
        remoteModule.budgetCategoryOrder ?? localModule.budgetCategoryOrder,
      budgetConceptOrder:
        remoteModule.budgetConceptOrder ?? localModule.budgetConceptOrder,
      userPreferences: {
        ...(remoteModule.userPreferences ?? {}),
        ...(localModule.userPreferences ?? {}),
      },
    },
    banks: remote.banks?.length ? remote.banks : local.banks,
    accounts: remote.accounts?.length ? remote.accounts : local.accounts,
    settings: {
      ...(remote.settings ?? {}),
      ...(local.settings ?? {}),
    },
  };
}
