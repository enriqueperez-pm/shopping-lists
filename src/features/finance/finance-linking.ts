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
  { category: 'Housing', subcategory: 'Rent', type: 'expense' },
  { category: 'Housing', subcategory: 'Utilities', type: 'expense' },
  { category: 'Housing', subcategory: 'Maintenance', type: 'expense' },
  { category: 'Housing', subcategory: 'Internet', type: 'expense' },
  { category: 'Food', subcategory: 'Groceries', type: 'expense' },
  { category: 'Food', subcategory: 'Restaurants', type: 'expense' },
  { category: 'Food', subcategory: 'Delivery', type: 'expense' },
  { category: 'Food', subcategory: 'Coffee', type: 'expense' },
  { category: 'Transport', subcategory: 'Gas', type: 'expense' },
  { category: 'Transport', subcategory: 'Uber/Taxi', type: 'expense' },
  { category: 'Transport', subcategory: 'Public Transit', type: 'expense' },
  { category: 'Transport', subcategory: 'Parking', type: 'expense' },
  { category: 'Health', subcategory: 'Pharmacy', type: 'expense' },
  { category: 'Health', subcategory: 'Gym', type: 'expense' },
  { category: 'Health', subcategory: 'Doctor', type: 'expense' },
  { category: 'Health', subcategory: 'Insurance', type: 'expense' },
  { category: 'Entertainment', subcategory: 'Streaming', type: 'expense' },
  { category: 'Entertainment', subcategory: 'Outings', type: 'expense' },
  { category: 'Entertainment', subcategory: 'Events', type: 'expense' },
  { category: 'Entertainment', subcategory: 'Games', type: 'expense' },
  { category: 'Personal', subcategory: 'Clothing', type: 'expense' },
  { category: 'Personal', subcategory: 'Grooming', type: 'expense' },
  { category: 'Personal', subcategory: 'Gifts', type: 'expense' },
  { category: 'Technology', subcategory: 'Software', type: 'expense' },
  { category: 'Technology', subcategory: 'Devices', type: 'expense' },
  { category: 'Technology', subcategory: 'Subscriptions', type: 'expense' },
  { category: 'Work', subcategory: 'Tools', type: 'expense' },
  { category: 'Work', subcategory: 'Education', type: 'expense' },
  { category: 'Work', subcategory: 'Office Supplies', type: 'expense' },
  { category: 'Savings', subcategory: 'Emergency Fund', type: 'expense' },
  { category: 'Savings', subcategory: 'Goals', type: 'expense' },
  { category: 'Pets', subcategory: 'Food', type: 'expense' },
  { category: 'Pets', subcategory: 'Vet', type: 'expense' },
  { category: 'Pets', subcategory: 'Grooming', type: 'expense' },
  { category: 'Other', subcategory: 'Miscellaneous', type: 'expense' },
  { category: 'Salary', subcategory: 'Main Job', type: 'income' },
  { category: 'Salary', subcategory: 'Side Job', type: 'income' },
  { category: 'Freelance', subcategory: 'Projects', type: 'income' },
  { category: 'Freelance', subcategory: 'Consulting', type: 'income' },
  { category: 'Interest', subcategory: 'Bank Interest', type: 'income' },
  { category: 'Interest', subcategory: 'Investments', type: 'income' },
  { category: 'Other Income', subcategory: 'Refunds', type: 'income' },
  { category: 'Other Income', subcategory: 'Gifts Received', type: 'income' },
  { category: 'Other Income', subcategory: 'Miscellaneous', type: 'income' },
  { category: 'Financial Services', subcategory: 'Commissions', type: 'expense' },
];

const MAY_2026_BUDGET_ITEMS: MonthlyBudgetSeedItem[] = [
  { category: 'Housing', subcategory: 'Rent', amount: 14500, fixed: true },
  { category: 'Housing', subcategory: 'Utilities', amount: 331, fixed: true },
  { category: 'Housing', subcategory: 'Gas', amount: 525, fixed: true },
  { category: 'Housing', subcategory: 'Electricity', amount: 260, fixed: true },
  { category: 'Transport', subcategory: 'Car', amount: 15386, fixed: true },
  { category: 'Technology', subcategory: 'Telmex', amount: 828, fixed: true },
  { category: 'Technology', subcategory: 'Phone', amount: 3487, fixed: true },
  { category: 'Food', subcategory: 'Comida Brunas', amount: 1000, fixed: false },
];

const getParentConceptKey = (type: 'income' | 'expense', category: string) =>
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
  date: string
): BudgetConcept[] {
  const targetPeriod = date.slice(0, 7);
  const all = getBudgetConcepts(db).filter((concept) => concept.type === type && !concept.isParent);
  const periodScoped = all.filter((concept) => concept.period === targetPeriod);
  return periodScoped.length > 0 ? periodScoped : all;
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
      description: `Categoría ${input.type === 'income' ? 'de ingreso' : 'de gasto'}`,
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
        description: `Subcategoría de ${category}`,
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

  let categoryPath = tx.category || 'Sin categoría';
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

  const currentConcepts = getBudgetConcepts(db);
  const nextConcepts = [...currentConcepts];
  const defaultCurrency = db.getTrackerConfig().defaultCurrency;
  const parentByKey = new Map<string, BudgetConcept>();
  const childKeys = new Set<string>();
  let changed = false;

  nextConcepts.forEach((concept) => {
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
  { category: 'Salary', subcategory: 'Main Job', amount: 45000, fixed: true },
  { category: 'Freelance', subcategory: 'Projects', amount: 8000, fixed: false },
];

/** Asegura conceptos de ingreso con presupuesto base para el periodo. */
export function ensureBaselineIncomeConcepts(db: FinancialDatabase, period: string) {
  ensureBaselineBudgetTaxonomy(db, period);
  const concepts = getBudgetConcepts(db);
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
          seed.subcategory === 'Main Job' ? 'Nómina principal' : existing.name || seed.subcategory;
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
      name: seed.subcategory === 'Main Job' ? 'Nómina principal' : 'Freelance / proyectos',
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
      normalizeValue(concept.category) === normalizeValue("Food") &&
      normalizeValue(concept.subcategory || concept.name) === normalizeValue("Groceries"),
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
      normalizeValue(row.concept.category) === normalizeValue("Food") &&
      normalizeValue(row.concept.subcategory || "") === normalizeValue("Groceries"),
  );
}

export function ensureMay2026BudgetSnapshot(db: FinancialDatabase): void {
  const period = "2026-05";
  const type: "expense" = "expense";

  MAY_2026_BUDGET_ITEMS.forEach((item) => {
    ensureCategoryPath(db, {
      type,
      category: item.category,
      subcategory: item.subcategory,
    });
  });

  const concepts = getBudgetConcepts(db);
  const now = nowIso();
  const nextConcepts = [...concepts];
  let changed = false;

  const parentByCategory = new Map<string, BudgetConcept>();
  for (const concept of nextConcepts) {
    if (!concept.isParent) continue;
    if (concept.type !== type) continue;
    if (concept.period !== period) continue;
    parentByCategory.set(normalizeValue(concept.category), concept);
  }

  const uniqueCategories = [...new Set(MAY_2026_BUDGET_ITEMS.map((item) => item.category))];
  for (const category of uniqueCategories) {
    const key = normalizeValue(category);
    if (parentByCategory.has(key)) continue;
    const parent: BudgetConcept = {
      id: createConceptId(),
      name: category,
      category,
      budgetedAmount: 0,
      actualAmount: 0,
      currency: 'MXN',
      period,
      type,
      isFixed: true,
      description: `Budget parent for ${category}`,
      isParent: true,
      createdAt: now,
      updatedAt: now,
    };
    nextConcepts.push(parent);
    parentByCategory.set(key, parent);
    changed = true;
  }

  for (const item of MAY_2026_BUDGET_ITEMS) {
    const existing = nextConcepts.find(
      (concept) =>
        !concept.isParent &&
        concept.type === type &&
        concept.period === period &&
        normalizeValue(concept.category) === normalizeValue(item.category) &&
        normalizeValue(concept.subcategory || '') === normalizeValue(item.subcategory)
    );

    if (existing) {
      if (
        existing.budgetedAmount !== item.amount ||
        existing.currency !== 'MXN' ||
        existing.isFixed !== (item.fixed !== false)
      ) {
        existing.budgetedAmount = item.amount;
        existing.currency = 'MXN';
        existing.isFixed = item.fixed !== false;
        existing.updatedAt = now;
        changed = true;
      }
      continue;
    }

    const parent = parentByCategory.get(normalizeValue(item.category));
    nextConcepts.push({
      id: createConceptId(),
      name: item.subcategory,
      category: item.category,
      subcategory: item.subcategory,
      budgetedAmount: item.amount,
      actualAmount: 0,
      currency: 'MXN',
      period,
      type,
      isFixed: item.fixed !== false,
      description: `Presupuesto mayo: ${item.subcategory}`,
      parentId: parent?.id,
      isParent: false,
      createdAt: now,
      updatedAt: now,
    });
    changed = true;
  }

  if (changed) {
    db.setModuleData('budgetConcepts', nextConcepts);
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

