import type { BudgetConcept } from "./types";
import type { EnhancedTransaction, FinancialDatabase } from "./FinancialDatabase";
import { buildBudgetAnalytics } from "./budget-analytics";

export interface TaxonomyCategoryNode {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string;
  icon?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface TransactionTrace {
  accountName: string;
  bankName: string;
  conceptName: string;
  categoryPath: string;
}

interface BaselineTaxonomySeedRow {
  category: string;
  subcategory: string;
  type: 'income' | 'expense';
}

interface MonthlyBudgetSeedItem {
  category: string;
  subcategory: string;
  amount: number;
  fixed?: boolean;
}

const nowIso = () => new Date().toISOString();

const createCategoryId = () => `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createConceptId = () => `concept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const normalizeValue = (value: string) => value.trim().toLowerCase();

const BASELINE_TAXONOMY_SEED: BaselineTaxonomySeedRow[] = [
  { category: 'Vivienda', subcategory: 'Renta', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Luz', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Agua', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Gas doméstico', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Mantenimiento', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Internet', type: 'expense' },
  { category: 'Vivienda', subcategory: 'Teléfono móvil', type: 'expense' },
  { category: 'Transporte', subcategory: 'Auto', type: 'expense' },
  { category: 'Transporte', subcategory: 'Gasolina', type: 'expense' },
  { category: 'Transporte', subcategory: 'Uber/Taxi', type: 'expense' },
  { category: 'Transporte', subcategory: 'Transporte público', type: 'expense' },
  { category: 'Transporte', subcategory: 'Estacionamiento', type: 'expense' },
  { category: 'Alimentación', subcategory: 'Despensa', type: 'expense' },
  { category: 'Alimentación', subcategory: 'Delivery', type: 'expense' },
  { category: 'Alimentación', subcategory: 'Restaurantes', type: 'expense' },
  { category: 'Alimentación', subcategory: 'Café', type: 'expense' },
  { category: 'Salud', subcategory: 'Farmacia', type: 'expense' },
  { category: 'Salud', subcategory: 'Gym', type: 'expense' },
  { category: 'Salud', subcategory: 'Doctor', type: 'expense' },
  { category: 'Salud', subcategory: 'Seguro', type: 'expense' },
  { category: 'Entretenimiento', subcategory: 'Salidas', type: 'expense' },
  { category: 'Tecnología', subcategory: 'Suscripciones', type: 'expense' },
  { category: 'Tecnología', subcategory: 'Software', type: 'expense' },
  { category: 'Tecnología', subcategory: 'Dispositivos', type: 'expense' },
  { category: 'Servicios financieros', subcategory: 'Impuestos', type: 'expense' },
  { category: 'Servicios financieros', subcategory: 'Pago de deuda', type: 'expense' },
  { category: 'Servicios financieros', subcategory: 'Comisiones', type: 'expense' },
  { category: 'Personal', subcategory: 'Misceláneos', type: 'expense' },
  { category: 'Personal', subcategory: 'Apoyo hogar', type: 'expense' },
  { category: 'Personal', subcategory: 'Ropa', type: 'expense' },
  { category: 'Personal', subcategory: 'Aseo personal', type: 'expense' },
  { category: 'Personal', subcategory: 'Regalos', type: 'expense' },
  { category: 'Mascotas', subcategory: 'Paseos', type: 'expense' },
  { category: 'Mascotas', subcategory: 'Comida Runa', type: 'expense' },
  { category: 'Mascotas', subcategory: 'Veterinario', type: 'expense' },
  { category: 'Mascotas', subcategory: 'Aseo', type: 'expense' },
  { category: 'Ahorro', subcategory: 'Metas', type: 'expense' },
  { category: 'Ahorro', subcategory: 'Fondo de emergencia', type: 'expense' },
  { category: 'Trabajo', subcategory: 'Herramientas', type: 'expense' },
  { category: 'Trabajo', subcategory: 'Educación', type: 'expense' },
  { category: 'Trabajo', subcategory: 'Oficina', type: 'expense' },
  { category: 'Otros', subcategory: 'Misceláneos', type: 'expense' },
  { category: 'Ingresos', subcategory: 'Nómina', type: 'income' },
  { category: 'Ingresos', subcategory: 'Freelance', type: 'income' },
];

export function getCanonicalCategories(type: 'income' | 'expense'): string[] {
  return [
    ...new Set(
      BASELINE_TAXONOMY_SEED.filter((row) => row.type === type).map((row) => row.category),
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getCanonicalSubcategories(
  type: 'income' | 'expense',
  category: string,
): string[] {
  const categoryLower = normalizeValue(category);
  return [
    ...new Set(
      BASELINE_TAXONOMY_SEED.filter(
        (row) => row.type === type && normalizeValue(row.category) === categoryLower,
      ).map((row) => row.subcategory),
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'));
}

const MAY_2026_BUDGET_ITEMS: MonthlyBudgetSeedItem[] = [
  { category: 'Vivienda', subcategory: 'Renta', amount: 14500, fixed: true },
  { category: 'Vivienda', subcategory: 'Agua', amount: 331, fixed: true },
  { category: 'Vivienda', subcategory: 'Gas doméstico', amount: 525, fixed: true },
  { category: 'Vivienda', subcategory: 'Luz', amount: 260, fixed: true },
  { category: 'Transporte', subcategory: 'Auto', amount: 15386, fixed: true },
  { category: 'Vivienda', subcategory: 'Internet', amount: 828, fixed: true },
  { category: 'Mascotas', subcategory: 'Comida Runa', amount: 1000, fixed: false },
];

export const getParentConceptKey = (type: 'income' | 'expense', category: string) =>
  `${type}::${normalizeValue(category)}`;

const getChildConceptKey = (
  type: 'income' | 'expense',
  category: string,
  subcategory: string
) => `${type}::${normalizeValue(category)}::${normalizeValue(subcategory)}`;

export function getCategoryTree(db: FinancialDatabase): TaxonomyCategoryNode[] {
  return db.getModuleData<TaxonomyCategoryNode>('categoriesTree').filter((row) => row.isActive !== false);
}

export function getBudgetConcepts(db: FinancialDatabase): BudgetConcept[] {
  return db.getModuleData<BudgetConcept>('budgetConcepts');
}

export function getBudgetConceptsForTypeAndDate(
  db: FinancialDatabase,
  type: 'income' | 'expense',
  date: string,
  options?: {
    selectedPeriod?: string;
    currentConceptId?: string;
    /** Incluye meses anteriores con presupuesto (impuestos, auto, etc.). */
    includePriorPeriodsWithBudget?: boolean;
  },
): BudgetConcept[] {
  const targetPeriod = date.slice(0, 7);
  const all = getBudgetConcepts(db).filter((concept) => concept.type === type && !concept.isParent);
  const periodSet = new Set<string>([targetPeriod]);

  if (options?.selectedPeriod) periodSet.add(options.selectedPeriod);
  if (options?.currentConceptId) {
    const linked = all.find((concept) => concept.id === options.currentConceptId);
    if (linked) periodSet.add(linked.period);
  }
  if (options?.includePriorPeriodsWithBudget !== false) {
    for (const concept of all) {
      if (concept.period <= targetPeriod && (concept.budgetedAmount || 0) > 0) {
        periodSet.add(concept.period);
      }
    }
  }

  return all
    .filter((concept) => periodSet.has(concept.period))
    .sort(
      (a, b) =>
        a.period.localeCompare(b.period) ||
        a.category.localeCompare(b.category, 'es') ||
        a.name.localeCompare(b.name, 'es'),
    );
}

export function formatPeriodShort(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

export function formatConceptPickerLabel(
  concept: BudgetConcept,
  referencePeriod?: string,
): string {
  if (referencePeriod && concept.period !== referencePeriod) {
    return `${formatPeriodShort(concept.period)} · ${concept.name}`;
  }
  return concept.name;
}

export function ensureCategoryPath(
  db: FinancialDatabase,
  input: { type: 'income' | 'expense'; category: string; subcategory?: string }
): { category: string; subcategory?: string } {
  const category = input.category.trim();
  const subcategory = input.subcategory?.trim() || undefined;
  if (!category) return { category: input.category, subcategory };

  const categories = getCategoryTree(db);
  const categoryLower = normalizeValue(category);
  const existingParent = categories.find(
    (row) => !row.parentId && row.type === input.type && normalizeValue(row.name) === categoryLower
  );

  let parentId = existingParent?.id;
  const nextCategories = [...categories];
  let changed = false;

  if (!parentId) {
    const parent: TaxonomyCategoryNode = {
      id: createCategoryId(),
      name: category,
      type: input.type,
      icon: 'tag',
      color: 'bg-slate-100 text-slate-700',
      description: `CategorÃ­a ${input.type === 'income' ? 'de ingreso' : 'de gasto'}`,
      isActive: true,
      createdAt: nowIso(),
    };
    parentId = parent.id;
    nextCategories.push(parent);
    changed = true;
  }

  if (subcategory) {
    const subLower = normalizeValue(subcategory);
    const existingChild = nextCategories.find(
      (row) =>
        row.parentId === parentId &&
        row.type === input.type &&
        normalizeValue(row.name) === subLower &&
        row.isActive !== false
    );
    if (!existingChild) {
      nextCategories.push({
        id: createCategoryId(),
        name: subcategory,
        type: input.type,
        parentId,
        icon: 'tag',
        color: 'bg-slate-100 text-slate-700',
        description: `SubcategorÃ­a de ${category}`,
        isActive: true,
        createdAt: nowIso(),
      });
      changed = true;
    }
  }

  if (changed) {
    db.setModuleData('categoriesTree', nextCategories);
  }
  return { category, subcategory };
}

export function applyConceptCategoryToTransaction(
  db: FinancialDatabase,
  data: {
    type: 'income' | 'expense' | 'transfer';
    budgetConceptId?: string;
    category?: string;
    subcategory?: string;
  }
) {
  if (!data.budgetConceptId) {
    return { category: data.category, subcategory: data.subcategory };
  }

  const concept = getBudgetConcepts(db).find((row) => row.id === data.budgetConceptId);
  if (!concept) {
    return { category: data.category, subcategory: data.subcategory };
  }

  const conceptType = concept.type;
  const ensured = ensureCategoryPath(db, {
    type: conceptType,
    category: concept.category,
    subcategory: concept.subcategory,
  });

  return {
    category: ensured.category,
    subcategory: ensured.subcategory,
  };
}

export function buildTransactionTrace(db: FinancialDatabase, tx: EnhancedTransaction): TransactionTrace {
  const accounts = db.getAccounts();
  const banks = db.getBanks();
  const concepts = getBudgetConcepts(db);
  const categories = getCategoryTree(db);

  const account = accounts.find((row) => row.id === tx.accountId);
  const bank = account ? banks.find((row) => row.id === account.bankId) : undefined;
  const concept = concepts.find((row) => row.id === tx.budgetConceptId);

  let categoryPath = tx.category || 'Sin categorÃ­a';
  if (concept) {
    if (concept.subcategory) {
      categoryPath = `${concept.category} / ${concept.subcategory}`;
    } else {
      categoryPath = concept.category;
    }
  } else {
    const parent = categories.find(
      (row) => !row.parentId && normalizeValue(row.name) === normalizeValue(tx.category || '')
    );
    if (parent && tx.subcategory) {
      categoryPath = `${parent.name} / ${tx.subcategory}`;
    }
  }

  return {
    accountName: account?.name || 'Sin cuenta',
    bankName: bank?.name || 'Sin banco',
    conceptName: concept?.name || 'Sin concepto',
    categoryPath,
  };
}

export function ensureBaselineBudgetTaxonomy(db: FinancialDatabase, period: string) {
  BASELINE_TAXONOMY_SEED.forEach((row) =>
    ensureCategoryPath(db, {
      type: row.type,
      category: row.category,
      subcategory: row.subcategory,
    })
  );

  const hasBrainPeriod = getBudgetConcepts(db).some(
    (concept) =>
      concept.period === period && !concept.isParent && concept.id.startsWith(`brain_${period}_`),
  );
  if (hasBrainPeriod) return;

  const hasPeriodConcepts = getBudgetConcepts(db).some(
    (concept) => concept.period === period && !concept.isParent,
  );
  if (hasPeriodConcepts) return;

  const currentConcepts = getBudgetConcepts(db);
  const nextConcepts = [...currentConcepts];
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;
  const parentByKey = new Map<string, BudgetConcept>();
  const childKeys = new Set<string>();
  let changed = false;

  nextConcepts.forEach((concept) => {
    if (concept.period !== period) return;
    const parentKey = getParentConceptKey(concept.type, concept.category);
    if (!concept.parentId && (concept.isParent || normalizeValue(concept.name) === normalizeValue(concept.category))) {
      if (!parentByKey.has(parentKey)) parentByKey.set(parentKey, concept);
    }

    if (concept.subcategory) {
      childKeys.add(getChildConceptKey(concept.type, concept.category, concept.subcategory));
    } else if (concept.parentId) {
      childKeys.add(getChildConceptKey(concept.type, concept.category, concept.name));
    }
  });

  const uniqueCategories = new Map<string, { type: 'income' | 'expense'; category: string }>();
  BASELINE_TAXONOMY_SEED.forEach((row) => {
    const key = getParentConceptKey(row.type, row.category);
    if (!uniqueCategories.has(key)) {
      uniqueCategories.set(key, { type: row.type, category: row.category });
    }
  });

  uniqueCategories.forEach(({ type, category }, key) => {
    if (parentByKey.has(key)) return;
    const parentConcept: BudgetConcept = {
      id: createConceptId(),
      name: category,
      category,
      budgetedAmount: 0,
      actualAmount: 0,
      currency: defaultCurrency,
      period,
      type,
      isFixed: false,
      description: `Parent concept for ${category}`,
      isParent: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    nextConcepts.push(parentConcept);
    parentByKey.set(key, parentConcept);
    changed = true;
  });

  BASELINE_TAXONOMY_SEED.forEach((row) => {
    const childKey = getChildConceptKey(row.type, row.category, row.subcategory);
    if (childKeys.has(childKey)) return;

    const parentKey = getParentConceptKey(row.type, row.category);
    const parent = parentByKey.get(parentKey);
    if (!parent) return;

    nextConcepts.push({
      id: createConceptId(),
      name: row.subcategory,
      category: row.category,
      subcategory: row.subcategory,
      budgetedAmount: 0,
      actualAmount: 0,
      currency: defaultCurrency,
      period,
      type: row.type,
      isFixed: false,
      description: `${row.category} / ${row.subcategory}`,
      parentId: parent.id,
      isParent: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    childKeys.add(childKey);
    changed = true;
  });

  if (changed) {
    db.setModuleData('budgetConcepts', nextConcepts);
  }
}

const BASELINE_INCOME_BUDGET: MonthlyBudgetSeedItem[] = [
  { category: 'Ingresos', subcategory: 'Nómina', amount: 45000, fixed: true },
  { category: 'Ingresos', subcategory: 'Freelance', amount: 8000, fixed: false },
];

/** Asegura conceptos de ingreso con presupuesto base para el periodo. */
export function ensureBaselineIncomeConcepts(db: FinancialDatabase, period: string) {
  ensureBaselineBudgetTaxonomy(db, period);
  const concepts = getBudgetConcepts(db);
  const hasIncomeInPeriod = concepts.some(
    (c) => !c.isParent && c.type === 'income' && c.period === period,
  );
  if (hasIncomeInPeriod) return;
  const next = [...concepts];
  let changed = false;
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;

  for (const seed of BASELINE_INCOME_BUDGET) {
    const existing = next.find(
      (c) =>
        !c.isParent &&
        c.type === 'income' &&
        c.period === period &&
        normalizeValue(c.category) === normalizeValue(seed.category) &&
        normalizeValue(c.subcategory || c.name) === normalizeValue(seed.subcategory),
    );
    if (existing) {
      if (existing.budgetedAmount === 0 && seed.amount > 0) {
        existing.budgetedAmount = seed.amount;
        existing.isFixed = seed.fixed ?? false;
        existing.name =
          seed.subcategory === 'Nómina' ? 'Nómina principal' : existing.name || seed.subcategory;
        existing.updatedAt = nowIso();
        changed = true;
      }
      continue;
    }

    const parent = next.find(
      (c) =>
        c.isParent &&
        c.type === 'income' &&
        c.period === period &&
        normalizeValue(c.category) === normalizeValue(seed.category),
    );
    if (!parent) continue;

    next.push({
      id: createConceptId(),
      name: seed.subcategory === 'Nómina' ? 'Nómina principal' : 'Freelance / proyectos',
      category: seed.category,
      subcategory: seed.subcategory,
      budgetedAmount: seed.amount,
      actualAmount: 0,
      currency: defaultCurrency,
      period,
      type: 'income',
      isFixed: seed.fixed ?? false,
      description: `${seed.category} / ${seed.subcategory}`,
      parentId: parent.id,
      isParent: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    changed = true;
  }

  if (changed) {
    db.setModuleData('budgetConcepts', next);
  }
}

export function findGroceriesConcept(db: FinancialDatabase, period: string) {
  return getBudgetConcepts(db).find(
    (concept) =>
      !concept.isParent &&
      concept.type === "expense" &&
      concept.period === period &&
      normalizeValue(concept.category) === normalizeValue("Alimentación") &&
      normalizeValue(concept.subcategory || concept.name) === normalizeValue("Despensa"),
  );
}

export function getGroceriesAnalysis(
  db: FinancialDatabase,
  period: string,
  transactions: EnhancedTransaction[],
) {
  const concepts = getBudgetConcepts(db);
  const analytics = buildBudgetAnalytics({ concepts, transactions, selectedPeriod: period });
  return analytics.leafAnalyses.find(
    (row) =>
      normalizeValue(row.concept.category) === normalizeValue("Alimentación") &&
      normalizeValue(row.concept.subcategory || "") === normalizeValue("Despensa"),
  );
}

export function ensureMay2026BudgetSnapshot(db: FinancialDatabase): void {
  const period = "2026-05";
  const hasBrainMay = getBudgetConcepts(db).some((c) => c.id.startsWith(`brain_${period}_`));
  if (!hasBrainMay) {
    const type: "expense" = "expense";
    MAY_2026_BUDGET_ITEMS.forEach((item) => {
      ensureCategoryPath(db, { type, category: item.category, subcategory: item.subcategory });
    });
    // ... legacy seed only when brain CSV has not been synced
  }
  const transferReference = 'deel-bancomer-2026-04-30-580';
  const accounts = db.getAccounts();
  const banks = db.getBanks();
  const byBank = new Map(banks.map((bank) => [bank.id, bank.name.toLowerCase()]));
  const deelAccount = accounts.find((account) => {
    const accountName = account.name.toLowerCase();
    const bankName = byBank.get(account.bankId) || '';
    return accountName.includes('deel') || bankName.includes('deel');
  });
  const bancomerAccount = accounts.find((account) => {
    const accountName = account.name.toLowerCase();
    const bankName = byBank.get(account.bankId) || '';
    return accountName.includes('bancomer') || bankName.includes('bancomer');
  });

  if (deelAccount && bancomerAccount) {
    const transferHistory = db.getModuleData<Record<string, unknown>>('transferHistory');
    const hasTransfer = transferHistory.some(
      (row) => String(row.reference || '') === transferReference
    );
    if (!hasTransfer) {
      const transferRecord = {
        id: `tx_${Date.now()}`,
        fromAccountId: deelAccount.id,
        toAccountId: bancomerAccount.id,
        amount: 580,
        currency: 'USD',
        exchangeRate: 17.33729,
        convertedAmount: 9832.67,
        description: 'Retiro Deel -> Bancomer (comision 12.86 USD)',
        date: '2026-04-30',
        status: 'pending',
        reference: transferReference,
      };
      db.setModuleData('transferHistory', [transferRecord, ...transferHistory]);
    }

    const transactions = db.getTransactions();
    const hasOut = transactions.some((tx) => tx.notes === `Transfer ref ${transferReference} OUT`);
    if (!hasOut) {
      db.addTransaction({
        type: 'expense',
        description: 'Transferencia a Bancomer',
        amount: 580,
        category: 'Transferencias',
        subcategory: 'Deel -> Bancomer',
        date: '2026-04-30',
        bankId: deelAccount.bankId,
        accountId: deelAccount.id,
        beneficiary: 'Bancomer',
        notes: `Transfer ref ${transferReference} OUT`,
        source: 'transfer',
        currency: 'USD',
        originalAmount: 580,
        originalCurrency: 'USD',
      });
    }

    const hasFee = transactions.some((tx) => tx.notes === `Transfer ref ${transferReference} FEE`);
    if (!hasFee) {
      db.addTransaction({
        type: 'expense',
        description: 'Comision transferencia Deel',
        amount: 12.86,
        category: 'Financial Services',
        subcategory: 'Commissions',
        date: '2026-04-30',
        bankId: deelAccount.bankId,
        accountId: deelAccount.id,
        beneficiary: 'Deel',
        notes: `Transfer ref ${transferReference} FEE`,
        source: 'transfer',
        currency: 'USD',
        originalAmount: 12.86,
        originalCurrency: 'USD',
      });
    }

    const hasIn = transactions.some((tx) => tx.notes === `Transfer ref ${transferReference} IN`);
    if (!hasIn) {
      db.addTransaction({
        type: 'income',
        description: 'Transferencia desde Deel',
        amount: 567.14,
        category: 'Transferencias',
        subcategory: 'Deel -> Bancomer',
        date: '2026-04-30',
        bankId: bancomerAccount.bankId,
        accountId: bancomerAccount.id,
        beneficiary: 'Deel',
        notes: `Transfer ref ${transferReference} IN`,
        source: 'transfer',
        currency: 'MXN',
        originalAmount: 9832.67,
        originalCurrency: 'MXN',
      });
    }
  }
}

export function getDistinctCategories(
  db: FinancialDatabase,
  type: 'income' | 'expense',
): string[] {
  const fromTree = getCategoryTree(db)
    .filter((row) => row.type === type && !row.parentId)
    .map((row) => row.name);
  const fromConcepts = getBudgetConcepts(db)
    .filter((row) => row.type === type)
    .map((row) => row.category);
  return [...new Set([...fromTree, ...fromConcepts])].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getDistinctSubcategories(
  db: FinancialDatabase,
  type: 'income' | 'expense',
  category: string,
): string[] {
  const categoryLower = normalizeValue(category);
  const fromTree = getCategoryTree(db);
  const parent = fromTree.find(
    (row) => row.type === type && !row.parentId && normalizeValue(row.name) === categoryLower,
  );
  const fromTreeSubs = parent
    ? fromTree
        .filter((row) => row.parentId === parent.id && row.isActive !== false)
        .map((row) => row.name)
    : [];
  const fromConcepts = getBudgetConcepts(db)
    .filter(
      (row) => row.type === type && normalizeValue(row.category) === categoryLower && row.subcategory,
    )
    .map((row) => row.subcategory as string);
  return [...new Set([...fromTreeSubs, ...fromConcepts])].sort((a, b) => a.localeCompare(b, 'es'));
}

export function groupBudgetConceptsByCategory(
  concepts: BudgetConcept[],
): Array<{ category: string; concepts: BudgetConcept[] }> {
  const map = new Map<string, BudgetConcept[]>();
  for (const concept of concepts) {
    const list = map.get(concept.category) ?? [];
    list.push(concept);
    map.set(concept.category, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([category, rows]) => ({
      category,
      concepts: rows.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
}

export function ensurePeriodConceptHierarchy(db: FinancialDatabase, period: string) {
  const concepts = getBudgetConcepts(db);
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;
  const parentByKey = new Map<string, BudgetConcept>();
  const next = [...concepts];
  let changed = false;

  next.forEach((concept) => {
    if (concept.isParent && concept.period === period && !concept.parentId) {
      parentByKey.set(getParentConceptKey(concept.type, concept.category), concept);
    }
  });

  for (let i = 0; i < next.length; i++) {
    const leaf = next[i];
    if (leaf.isParent || leaf.period !== period || leaf.parentId) continue;

    const key = getParentConceptKey(leaf.type, leaf.category);
    let parent = parentByKey.get(key);
    if (!parent) {
      parent = {
        id: createConceptId(),
        name: leaf.category,
        category: leaf.category,
        budgetedAmount: 0,
        actualAmount: 0,
        currency: defaultCurrency,
        period,
        type: leaf.type,
        isFixed: false,
        description: `Parent ${leaf.category}`,
        isParent: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      next.push(parent);
      parentByKey.set(key, parent);
      changed = true;
    }

    next[i] = { ...leaf, parentId: parent.id, updatedAt: nowIso() };
    changed = true;
  }

  if (changed) {
    db.setModuleData('budgetConcepts', next);
  }
}

function findOrCreateParentConcept(
  concepts: BudgetConcept[],
  period: string,
  type: 'income' | 'expense',
  category: string,
  defaultCurrency: BudgetConcept['currency'],
): { concepts: BudgetConcept[]; parent: BudgetConcept; changed: boolean } {
  const key = getParentConceptKey(type, category);
  const existing = concepts.find(
    (row) =>
      row.isParent &&
      row.period === period &&
      !row.parentId &&
      getParentConceptKey(row.type, row.category) === key,
  );
  if (existing) return { concepts, parent: existing, changed: false };

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
  return { concepts: [...concepts, parent], parent, changed: true };
}

export function createBudgetConcept(
  db: FinancialDatabase,
  input: {
    period: string;
    type: 'income' | 'expense';
    category: string;
    subcategory?: string;
    name: string;
    budgetedAmount?: number;
    isFixed?: boolean;
    description?: string;
  },
): BudgetConcept {
  const category = input.category.trim();
  const subcategory = input.subcategory?.trim() || undefined;
  const name = input.name.trim();
  if (!category || !name) {
    throw new Error('La categorÃ­a y el nombre son obligatorios');
  }

  ensureCategoryPath(db, { type: input.type, category, subcategory });
  ensurePeriodConceptHierarchy(db, input.period);

  let concepts = getBudgetConcepts(db);
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;

  const duplicate = concepts.find(
    (row) =>
      !row.isParent &&
      row.period === input.period &&
      row.type === input.type &&
      normalizeValue(row.category) === normalizeValue(category) &&
      normalizeValue(row.subcategory || '') === normalizeValue(subcategory || '') &&
      normalizeValue(row.name) === normalizeValue(name),
  );
  if (duplicate) return duplicate;

  const parentResult = findOrCreateParentConcept(
    concepts,
    input.period,
    input.type,
    category,
    defaultCurrency,
  );
  concepts = parentResult.concepts;

  const child: BudgetConcept = {
    id: createConceptId(),
    name,
    category,
    subcategory,
    budgetedAmount: input.budgetedAmount ?? 0,
    actualAmount: 0,
    currency: defaultCurrency,
    period: input.period,
    type: input.type,
    isFixed: input.isFixed ?? false,
    description: input.description,
    parentId: parentResult.parent.id,
    isParent: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.setModuleData('budgetConcepts', [...concepts, child]);
  return child;
}

export function copyBudgetConceptsFromPeriod(
  db: FinancialDatabase,
  fromPeriod: string,
  toPeriod: string,
) {
  ensurePeriodConceptHierarchy(db, fromPeriod);
  ensurePeriodConceptHierarchy(db, toPeriod);

  let concepts = getBudgetConcepts(db);
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;
  const prevLeaves = concepts.filter((row) => !row.isParent && row.period === fromPeriod);
  if (prevLeaves.length === 0) return;

  let changed = false;
  for (const src of prevLeaves) {
    const exists = concepts.some(
      (row) =>
        row.period === toPeriod &&
        !row.isParent &&
        row.type === src.type &&
        normalizeValue(row.category) === normalizeValue(src.category) &&
        normalizeValue(row.subcategory || '') === normalizeValue(src.subcategory || '') &&
        normalizeValue(row.name) === normalizeValue(src.name),
    );
    if (exists) continue;

    const parentResult = findOrCreateParentConcept(
      concepts,
      toPeriod,
      src.type,
      src.category,
      defaultCurrency,
    );
    if (parentResult.changed) {
      concepts = parentResult.concepts;
      changed = true;
    }

    concepts.push({
      ...src,
      id: createConceptId(),
      period: toPeriod,
      parentId: parentResult.parent.id,
      actualAmount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    changed = true;
  }

  if (changed) {
    db.setModuleData('budgetConcepts', concepts);
  }
}

const periodParentKey = (period: string, type: 'income' | 'expense', category: string) =>
  `${period}::${getParentConceptKey(type, category)}`;

const leafConceptKey = (concept: BudgetConcept) =>
  `${concept.period}::${concept.type}::${normalizeValue(concept.category)}::${normalizeValue(concept.subcategory || concept.name)}`;

function pickCanonicalConcept(a: BudgetConcept, b: BudgetConcept): BudgetConcept {
  const aBrain = a.id.startsWith('brain_');
  const bBrain = b.id.startsWith('brain_');
  if (aBrain && !bBrain) return a;
  if (bBrain && !aBrain) return b;
  return new Date(a.createdAt).getTime() <= new Date(b.createdAt).getTime() ? a : b;
}

export function dedupeBudgetConcepts(concepts: BudgetConcept[]): BudgetConcept[] {
  return dedupeBudgetConceptsInternal(concepts).concepts;
}

function dedupeBudgetConceptsInternal(concepts: BudgetConcept[]): {
  concepts: BudgetConcept[];
  idRemap: Map<string, string>;
} {
  const parentCanonical = new Map<string, BudgetConcept>();
  const parentIdRemap = new Map<string, string>();
  const leafCanonical = new Map<string, BudgetConcept>();
  const dropIds = new Set<string>();

  for (const concept of concepts) {
    if (!concept.isParent || concept.parentId) continue;
    const key = periodParentKey(concept.period, concept.type, concept.category);
    const existing = parentCanonical.get(key);
    if (!existing) {
      parentCanonical.set(key, concept);
      continue;
    }
    const keep = pickCanonicalConcept(existing, concept);
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
    const keep = pickCanonicalConcept(existing, concept);
    const drop = keep.id === existing.id ? concept : existing;
    keep.budgetedAmount = Math.max(keep.budgetedAmount, drop.budgetedAmount);
    keep.actualAmount = Math.max(keep.actualAmount, drop.actualAmount);
    keep.updatedAt = nowIso();
    leafCanonical.set(key, keep);
    parentIdRemap.set(drop.id, keep.id);
    dropIds.add(drop.id);
  }

  const next = concepts
    .filter((concept) => !dropIds.has(concept.id))
    .map((concept) => {
      if (concept.isParent) return concept;
      const parentId = concept.parentId ? parentIdRemap.get(concept.parentId) ?? concept.parentId : undefined;
      return parentId && parentId !== concept.parentId
        ? { ...concept, parentId, updatedAt: nowIso() }
        : concept;
    });

  return { concepts: next, idRemap: parentIdRemap };
}

export function dedupeBudgetConceptsInDb(db: FinancialDatabase) {
  const next = dedupeBudgetConcepts(getBudgetConcepts(db));
  if (next.length !== getBudgetConcepts(db).length) {
    db.setModuleData('budgetConcepts', next);
    return true;
  }

  const before = JSON.stringify(getBudgetConcepts(db));
  const after = JSON.stringify(next);
  if (before !== after) {
    db.setModuleData('budgetConcepts', next);
    return true;
  }
  return false;
}

export function repairBudgetHierarchy(db: FinancialDatabase, periodFilter?: string): boolean {
  const beforeConcepts = getBudgetConcepts(db);
  const { concepts: deduped, idRemap } = dedupeBudgetConceptsInternal(beforeConcepts);
  let concepts = deduped;
  let changed =
    concepts.length !== beforeConcepts.length ||
    JSON.stringify(concepts) !== JSON.stringify(beforeConcepts);

  const periods = periodFilter
    ? [periodFilter]
    : [...new Set(concepts.map((c) => c.period))];

  const defaultCurrency = db.getTrackerConfig().defaultCurrency;

  for (const period of periods) {
    const parentByKey = new Map<string, BudgetConcept>();

    for (const concept of concepts) {
      if (concept.isParent && concept.period === period && !concept.parentId) {
        const key = getParentConceptKey(concept.type, concept.category);
        if (!parentByKey.has(key)) parentByKey.set(key, concept);
      }
    }

    const parentIds = () =>
      new Set(
        concepts
          .filter((c) => c.isParent && c.period === period && !c.parentId)
          .map((c) => c.id),
      );

    let ids = parentIds();

    for (let i = 0; i < concepts.length; i++) {
      const leaf = concepts[i];
      if (leaf.isParent || leaf.period !== period) continue;

      const parentValid =
        leaf.parentId &&
        ids.has(leaf.parentId) &&
        concepts.some((p) => p.id === leaf.parentId && p.isParent && !p.parentId);

      if (parentValid) continue;

      const key = getParentConceptKey(leaf.type, leaf.category);
      let parent = parentByKey.get(key);
      if (!parent) {
        parent = {
          id: createConceptId(),
          name: leaf.category,
          category: leaf.category,
          budgetedAmount: 0,
          actualAmount: 0,
          currency: defaultCurrency,
          period,
          type: leaf.type,
          isFixed: false,
          description: `Parent ${leaf.category}`,
          isParent: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        concepts = [...concepts, parent];
        parentByKey.set(key, parent);
        ids = parentIds();
        changed = true;
      }

      if (leaf.parentId !== parent.id) {
        concepts = concepts.map((c, idx) =>
          idx === i ? { ...c, parentId: parent!.id, updatedAt: nowIso() } : c,
        );
        changed = true;
      }
    }

    const leafParentIds = new Set(
      concepts
        .filter((c) => !c.isParent && c.period === period && c.parentId)
        .map((c) => c.parentId as string),
    );
    const filtered = concepts.filter((c) => {
      if (!c.isParent || c.period !== period || c.parentId) return true;
      return leafParentIds.has(c.id);
    });
    if (filtered.length !== concepts.length) {
      concepts = filtered;
      changed = true;
    }
  }

  if (idRemap.size > 0) {
    for (const tx of db.getTransactions()) {
      if (!tx.budgetConceptId || !idRemap.has(tx.budgetConceptId)) continue;
      const newId = idRemap.get(tx.budgetConceptId)!;
      if (newId !== tx.budgetConceptId && db.updateTransaction(tx.id, { budgetConceptId: newId })) {
        changed = true;
      }
    }
  }

  if (changed) {
    db.setModuleData('budgetConcepts', concepts);
  }
  return changed;
}

export function repairBudgetHierarchyInDb(db: FinancialDatabase, period?: string): boolean {
  return repairBudgetHierarchy(db, period);
}

export function categoryOrderKey(period: string, type: 'income' | 'expense') {
  return `${period}:${type}`;
}

export function getBudgetCategoryOrder(
  db: FinancialDatabase,
  period: string,
  type: 'income' | 'expense',
): string[] {
  return db.getBudgetCategoryOrderMap()[categoryOrderKey(period, type)] ?? [];
}

export function setBudgetCategoryOrder(
  db: FinancialDatabase,
  period: string,
  type: 'income' | 'expense',
  order: string[],
) {
  const all = { ...db.getBudgetCategoryOrderMap() };
  all[categoryOrderKey(period, type)] = order;
  db.setBudgetCategoryOrderMap(all);
}

export function sortGroupsByCategoryOrder<T extends { parent: { concept: BudgetConcept } }>(
  groups: T[],
  order: string[],
): T[] {
  if (order.length === 0) return groups;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...groups].sort((a, b) => {
    const aRank = rank.get(a.parent.concept.id);
    const bRank = rank.get(b.parent.concept.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return a.parent.concept.category.localeCompare(b.parent.concept.category, 'es');
  });
}

export function moveCategoryInOrder(
  db: FinancialDatabase,
  period: string,
  type: 'income' | 'expense',
  parentId: string,
  direction: 'up' | 'down',
  allParentIds: string[],
) {
  const current = getBudgetCategoryOrder(db, period, type);
  const order = current.length > 0 ? [...current] : [...allParentIds];
  if (!order.includes(parentId)) order.push(parentId);

  const index = order.indexOf(parentId);
  if (index === -1) return;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= order.length) return;

  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  setBudgetCategoryOrder(db, period, type, order);
}
