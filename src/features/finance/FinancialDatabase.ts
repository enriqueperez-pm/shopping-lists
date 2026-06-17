export interface Bank {
  id: string;
  name: string;
  code?: string;
  color: string;
  custom: boolean;
}

export interface Account {
  id: string;
  bankId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'debit' | 'investment';
  number?: string;
  currency: string;
  color: string;
  custom: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  parent?: string;
  custom: boolean;
}

export interface Debt {
  id: string;
  name: string;
  lender: string;
  principalAmount: number;
  interestRateAnnual: number;
  startDate: string;
  dueDate: string;
  minimumPayment: number;
  currency: string;
  status: 'active' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  bankId?: string;
  name: string;
  last4?: string;
  limitAmount: number;
  annualFee: number;
  interestRateAnnual: number;
  paymentDueDay: number;
  cutoffDay: number;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/** Reglas tipo hoja Counterparties (Finance Tracker Sheets). */
export interface Counterparty {
  id: string;
  matchText: string;
  txType: 'income' | 'expense' | 'transfer';
  category: string;
  subcategory?: string;
  toAccount?: string;
  notes?: string;
}

/** Config global alineada a la hoja Config del script Sheets. */
export interface TrackerAppConfig {
  defaultCurrency: 'MXN' | 'USD';
  usdToMxnRate: number;
  monthStartDay: number;
  weekStartDay: 'Monday' | 'Sunday';
  formUrl?: string;
  appName?: string;
}

export interface AmortizationSchedule {
  id: string;
  debtId: string;
  installmentNumber: number;
  paymentDate: string;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingPrincipal: number;
  currency: string;
  paid: boolean;
}

export interface CategorySubcategoryOption {
  category: string;
  subcategories: string[];
}

export interface Budget {
  id: string;
  period: string; // YYYY-MM format
  categories: {
    [categoryId: string]: {
      budgeted: number;
      actual: number;
    };
  };
  created: string;
  lastUpdate: string;
}

/** Forma persistida en localStorage / Supabase (JSON). */
export interface FinancialPersistedData {
  transactions: EnhancedTransaction[];
  banks: Bank[];
  accounts: Account[];
  categories: {
    income: Category[];
    expense: Category[];
  };
  budgets: { [period: string]: Budget };
  debts?: Debt[];
  creditCards?: CreditCard[];
  amortizationSchedules?: AmortizationSchedule[];
  moduleData?: {
    budgetConcepts?: unknown[];
    categoriesTree?: unknown[];
    beneficiaryAccounts?: unknown[];
    counterparties?: unknown[];
    legacyBanks?: unknown[];
    legacyAccounts?: unknown[];
    transferHistory?: unknown[];
    cashflowSettings?: CashflowSettings;
    budgetCategoryOrder?: Record<string, string[]>;
    budgetConceptOrder?: Record<string, string[]>;
    userPreferences?: FinanceUserPreferences;
  };
  settings: {
    version: string;
    created: string;
    lastUpdate?: string;
    trackerConfig?: TrackerAppConfig;
  };
}

export function isFinancialPersistedData(value: unknown): value is FinancialPersistedData {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.transactions) || !Array.isArray(o.banks) || !Array.isArray(o.accounts)) {
    return false;
  }
  if (!o.categories || typeof o.categories !== 'object') return false;
  const c = o.categories as Record<string, unknown>;
  if (!Array.isArray(c.income) || !Array.isArray(c.expense)) return false;
  if (!o.budgets || typeof o.budgets !== 'object') return false;
  if (!o.settings || typeof o.settings !== 'object') return false;
  return true;
}

const MODULE_STORAGE_KEYS = {
  budgetConcepts: 'financial_budget_concepts',
  categoriesTree: 'financial_categories',
  beneficiaryAccounts: 'financial_beneficiary_accounts',
  counterparties: 'financial_counterparties',
  legacyBanks: 'financial_banks',
  legacyAccounts: 'financial_accounts',
  transferHistory: 'financial_transfers',
} as const;

/** Borra finanzas locales del navegador (no toca Supabase). Tras recargar, la app baja la nube. */
export function clearLocalFinanceStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("financialEstadoResultados");
  localStorage.removeItem("financial_transactions");
  for (const key of Object.values(MODULE_STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}

type ModuleDataKey = keyof typeof MODULE_STORAGE_KEYS;

export interface WorkspaceSeedData {
  transactions?: Omit<EnhancedTransaction, 'id' | 'timestamp'>[];
  banks?: Omit<Bank, 'id'>[];
  accounts?: Omit<Account, 'id'>[];
  debts?: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>[];
  creditCards?: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>[];
  amortizationSchedules?: Array<
    Omit<AmortizationSchedule, 'id' | 'debtId'> & { debtId?: string; debtName?: string }
  >;
  moduleData?: FinancialPersistedData['moduleData'];
}

export interface CashflowSettings {
  manualAvailableByPeriod?: Record<string, number>;
}

export type FinanceUserPreferences = {
  selectedPeriod?: string;
  budgetTab?: "gastos" | "ingresos";
  gastosFilter?: "all" | "out" | "in";
  collapsedSections?: Record<string, boolean>;
  showEmptyConcepts?: boolean;
  organizeMode?: boolean;
  recentConceptIds?: string[];
  lastCloudSyncAck?: string;
  updatedAt?: string;
};

export interface EnhancedTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  amount: number;
  category: string;
  date: string;
  timestamp: string;
  bankId?: string;
  accountId?: string;
  beneficiary?: string;
  notes?: string;
  source?: "manual" | "bank" | "import" | "transfer" | "shopping_trip";
  sourceId?: string;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  subcategory?: string;
  budgetConceptId?: string;
  linkReviewStatus?: "pending" | "confirmed" | "incorrect";
  linkReviewedAt?: string;
  suggestedConceptId?: string;
}

export class FinancialDatabase {
  private dbName = 'financialEstadoResultados';
  private data!: FinancialPersistedData;
  private readonly hooks?: { onAfterSave?: () => void };

  constructor(hooks?: { onAfterSave?: () => void }) {
    this.hooks = hooks;
    this.loadData();
  }

  private loadData() {
    if (typeof window === "undefined") {
      this.initializeEmptyData();
      return;
    }
    const saved = localStorage.getItem(this.dbName);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        this.migrateDataShape();
        // Migrate old data if needed
        if (!this.data.settings) {
          this.data.settings = {
            version: '2.0',
            created: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error('Error loading data:', error);
        this.initializeEmptyData();
      }
    } else {
      this.initializeEmptyData();
    }
  }

  private migrateDataShape() {
    if (!this.data.debts) this.data.debts = [];
    if (!this.data.creditCards) this.data.creditCards = [];
    if (!this.data.amortizationSchedules) this.data.amortizationSchedules = [];
    if (!this.data.moduleData) this.data.moduleData = {};

    // Migrar transacciones legadas de una clave histórica.
    const legacyTransactionsRaw = localStorage.getItem('financial_transactions');
    if (legacyTransactionsRaw && this.data.transactions.length === 0) {
      try {
        const legacyTransactions = JSON.parse(legacyTransactionsRaw);
        if (Array.isArray(legacyTransactions)) {
          this.data.transactions = legacyTransactions.map((t: Partial<EnhancedTransaction>) => ({
            id: t.id || this.generateId(),
            type:
              t.type === 'expense'
                ? 'expense'
                : t.type === 'transfer'
                  ? 'transfer'
                  : 'income',
            description: t.description || 'Movimiento migrado',
            amount: Number(t.amount || 0),
            category: t.category || 'Otros',
            subcategory: t.subcategory,
            date: t.date || new Date().toISOString().split('T')[0],
            timestamp: t.timestamp || new Date().toISOString(),
            bankId: t.bankId,
            accountId: t.accountId,
            beneficiary: t.beneficiary,
            notes: t.notes,
            source: t.source || 'manual',
            currency: t.currency || 'USD',
            originalAmount: t.originalAmount,
            originalCurrency: t.originalCurrency,
            budgetConceptId: t.budgetConceptId,
          }));
        }
      } catch (error) {
        console.error('Error migrating legacy transactions:', error);
      }
    }

    this.migrateBeneficiaryToCounterparties();
    const configAdded = this.ensureTrackerConfig();
    this.captureModuleDataFromLocalStorage({ persist: false });
    if (configAdded) {
      this.saveData({ skipCloudHook: true });
    }
  }

  private ensureTrackerConfig(): boolean {
    if (!this.data.settings) this.data.settings = { version: '3.0', created: new Date().toISOString() };
    if (!this.data.settings.trackerConfig) {
      this.data.settings.trackerConfig = {
        defaultCurrency: 'MXN',
        usdToMxnRate: 17.07,
        monthStartDay: 1,
        weekStartDay: 'Monday',
        appName: 'apppresupuesto',
      };
      return true;
    }
    return false;
  }

  /** Migra datos legacy de Beneficiarios a Contrapartes (una sola vez). */
  private migrateBeneficiaryToCounterparties() {
    if (!this.data.moduleData) this.data.moduleData = {};
    const existing = (this.data.moduleData.counterparties as Counterparty[] | undefined)?.filter(
      (c) => c && c.matchText
    );
    if (existing && existing.length > 0) return;

    const rawBen = this.readStorageArray(MODULE_STORAGE_KEYS.beneficiaryAccounts) as Array<{
      name?: string;
      description?: string;
      bankName?: string;
    }>;
    if (!rawBen.length) return;

    const mapped: Counterparty[] = rawBen
      .filter((b) => b?.name?.trim())
      .map((b) => ({
        id: this.generateId(),
        matchText: b.name!.trim(),
        txType: 'expense',
        category: 'Other',
        subcategory: 'Miscellaneous',
        toAccount: b.bankName || '',
        notes: b.description || 'Migrado desde beneficiarios',
      }));

    if (mapped.length === 0) return;
    this.data.moduleData.counterparties = mapped;
    localStorage.setItem(MODULE_STORAGE_KEYS.counterparties, JSON.stringify(mapped));
    this.saveData({ skipCloudHook: true });
  }

  getTrackerConfig(): TrackerAppConfig {
    this.ensureTrackerConfig();
    return { ...(this.data.settings!.trackerConfig!) };
  }

  setTrackerConfig(updates: Partial<TrackerAppConfig>, options?: { skipCloudHook?: boolean }): void {
    this.ensureTrackerConfig();
    this.data.settings.trackerConfig = {
      ...this.data.settings.trackerConfig!,
      ...updates,
    };
    this.saveData({ skipCloudHook: options?.skipCloudHook === true });
  }

  private initializeEmptyData() {
    this.data = {
      transactions: [],
      banks: [
        { id: 'bank_1', name: 'Banco Principal', code: '001', color: '#2563eb', custom: false }
      ],
      accounts: [
        { id: 'acc_1', bankId: 'bank_1', name: 'Cuenta Principal', type: 'checking', number: '****1234', currency: 'MXN', color: '#059669', custom: false }
      ],
      categories: {
        income: [
          { id: 'inc_1', name: 'Ingresos Operacionales', type: 'income', color: '#059669', custom: false },
          { id: 'inc_2', name: 'Ingresos Financieros', type: 'income', color: '#059669', custom: false },
          { id: 'inc_3', name: 'Otros Ingresos', type: 'income', color: '#059669', custom: false }
        ],
        expense: [
          { id: 'exp_1', name: 'Gastos Operacionales', type: 'expense', color: '#dc2626', custom: false },
          { id: 'exp_2', name: 'Gastos Administrativos', type: 'expense', color: '#dc2626', custom: false },
          { id: 'exp_3', name: 'Gastos Financieros', type: 'expense', color: '#dc2626', custom: false }
        ]
      },
      budgets: {},
      debts: [],
      creditCards: [],
      amortizationSchedules: [],
      moduleData: {},
      settings: {
        version: '3.0',
        created: new Date().toISOString(),
        trackerConfig: {
          defaultCurrency: 'MXN',
          usdToMxnRate: 17.07,
          monthStartDay: 1,
          weekStartDay: 'Monday',
          appName: 'apppresupuesto',
        },
      },
    };
    this.captureModuleDataFromLocalStorage({ persist: false });
  }

  private saveData(options?: { skipCloudHook?: boolean }) {
    this.captureModuleDataFromLocalStorage({ persist: false });
    this.data.settings.lastUpdate = new Date().toISOString();
    if (typeof window !== "undefined") {
      localStorage.setItem(this.dbName, JSON.stringify(this.data));
    }
    if (!options?.skipCloudHook) {
      try {
        this.hooks?.onAfterSave?.();
      } catch (e) {
        console.error('onAfterSave:', e);
      }
    }
  }

  getLastUpdateMs(): number {
    const raw = this.data.settings?.lastUpdate;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  exportFullStateObject(): FinancialPersistedData {
    this.captureModuleDataFromLocalStorage({ persist: false });
    return JSON.parse(JSON.stringify(this.data)) as FinancialPersistedData;
  }

  /**
   * Reemplaza el estado local (p. ej. sincronizado desde Supabase).
   * @param skipCloudHook evita re-subir justo después de descargar de la nube.
   */
  importFullState(payload: unknown, options?: { skipCloudHook?: boolean }): boolean {
    if (!isFinancialPersistedData(payload)) return false;
    this.data = JSON.parse(JSON.stringify(payload)) as FinancialPersistedData;
    this.restoreModuleDataToLocalStorage();
    this.saveData({ skipCloudHook: options?.skipCloudHook === true });
    return true;
  }

  private readStorageArray(key: string): unknown[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private arraysEqual(a: unknown[] = [], b: unknown[] = []): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  captureModuleDataFromLocalStorage(options?: { persist?: boolean }): boolean {
    const current = this.data.moduleData || {};
    const next = {
      budgetConcepts: this.readStorageArray(MODULE_STORAGE_KEYS.budgetConcepts),
      categoriesTree: this.readStorageArray(MODULE_STORAGE_KEYS.categoriesTree),
      beneficiaryAccounts: this.readStorageArray(MODULE_STORAGE_KEYS.beneficiaryAccounts),
      counterparties: this.readStorageArray(MODULE_STORAGE_KEYS.counterparties),
      legacyBanks: this.readStorageArray(MODULE_STORAGE_KEYS.legacyBanks),
      legacyAccounts: this.readStorageArray(MODULE_STORAGE_KEYS.legacyAccounts),
      transferHistory: this.readStorageArray(MODULE_STORAGE_KEYS.transferHistory),
    };

    const changed =
      !this.arraysEqual(current.budgetConcepts, next.budgetConcepts) ||
      !this.arraysEqual(current.categoriesTree, next.categoriesTree) ||
      !this.arraysEqual(current.beneficiaryAccounts, next.beneficiaryAccounts) ||
      !this.arraysEqual(current.counterparties, next.counterparties) ||
      !this.arraysEqual(current.legacyBanks, next.legacyBanks) ||
      !this.arraysEqual(current.legacyAccounts, next.legacyAccounts) ||
      !this.arraysEqual(current.transferHistory, next.transferHistory);

    if (changed) {
      this.data.moduleData = next;
      if (options?.persist) {
        this.saveData({ skipCloudHook: true });
      }
    }
    return changed;
  }

  restoreModuleDataToLocalStorage(): void {
    const moduleData = this.data.moduleData;
    if (!moduleData) return;
    if (moduleData.budgetConcepts) {
      localStorage.setItem(MODULE_STORAGE_KEYS.budgetConcepts, JSON.stringify(moduleData.budgetConcepts));
    }
    if (moduleData.categoriesTree) {
      localStorage.setItem(MODULE_STORAGE_KEYS.categoriesTree, JSON.stringify(moduleData.categoriesTree));
    }
    if (moduleData.beneficiaryAccounts) {
      localStorage.setItem(MODULE_STORAGE_KEYS.beneficiaryAccounts, JSON.stringify(moduleData.beneficiaryAccounts));
    }
    if (moduleData.counterparties) {
      localStorage.setItem(MODULE_STORAGE_KEYS.counterparties, JSON.stringify(moduleData.counterparties));
    }
    if (moduleData.legacyBanks) {
      localStorage.setItem(MODULE_STORAGE_KEYS.legacyBanks, JSON.stringify(moduleData.legacyBanks));
    }
    if (moduleData.legacyAccounts) {
      localStorage.setItem(MODULE_STORAGE_KEYS.legacyAccounts, JSON.stringify(moduleData.legacyAccounts));
    }
    if (moduleData.transferHistory) {
      localStorage.setItem(MODULE_STORAGE_KEYS.transferHistory, JSON.stringify(moduleData.transferHistory));
    }
  }

  getModuleData<T>(key: ModuleDataKey): T[] {
    const local = this.readStorageArray(MODULE_STORAGE_KEYS[key]) as T[];
    if (local.length > 0) return local;
    return ((this.data.moduleData?.[key] as T[] | undefined) || []);
  }

  setModuleData<T>(key: ModuleDataKey, value: T[], options?: { skipCloudHook?: boolean }): void {
    localStorage.setItem(MODULE_STORAGE_KEYS[key], JSON.stringify(value));
    if (!this.data.moduleData) this.data.moduleData = {};
    this.data.moduleData[key] = value;
    this.saveData({ skipCloudHook: options?.skipCloudHook === true });
  }

  addTransaction(transaction: Omit<EnhancedTransaction, 'id' | 'timestamp'>): EnhancedTransaction {
    const newTransaction: EnhancedTransaction = {
      ...transaction,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      source: transaction.source || 'manual'
    };
    
    this.data.transactions.push(newTransaction);
    this.saveData();
    return newTransaction;
  }

  getTransactions(month?: string): EnhancedTransaction[] {
    let transactions = [...this.data.transactions];
    
    if (month) {
      transactions = transactions.filter(t => t.date.startsWith(month));
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  deleteTransaction(id: string): void {
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.saveData();
  }

  updateTransaction(id: string, updates: Partial<EnhancedTransaction>): boolean {
    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.data.transactions[index] = {
      ...this.data.transactions[index],
      ...updates,
      id: this.data.transactions[index].id,
      timestamp: new Date().toISOString(),
    };
    this.saveData();
    return true;
  }

  clearAll(): void {
    this.initializeEmptyData();
    this.saveData();
  }

  exportToCSV(): string {
    const headers = ['id', 'type', 'description', 'amount', 'category', 'date', 'timestamp'];
    const csvContent = [
      headers.join(','),
      ...this.data.transactions.map(t => 
        headers.map(h => `"${(t as any)[h] || ''}"`).join(',')
      )
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estado_resultados_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    return csvContent;
  }

  importFromCSV(csvText: string): number {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return 0;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    let imported = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length >= 4) {
          const transaction: Omit<EnhancedTransaction, 'id' | 'timestamp'> = {
            type: values[1]?.toLowerCase() === 'expense' ? 'expense' : 'income',
            description: values[2] || 'Importado',
            amount: parseFloat(values[3]) || 0,
            category: values[4] || 'Otros',
            date: this.parseDate(values[5]) || new Date().toISOString().split('T')[0],
            currency: 'USD',
            source: 'import',
          };
          
          if (transaction.amount && transaction.date) {
            this.addTransaction(transaction);
            imported++;
          }
        }
      } catch (error) {
        console.error('Error parsing line:', lines[i], error);
      }
    }
    
    return imported;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try different date formats
    const cleanDate = dateStr.replace(/"/g, '').trim();
    
    // ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    // Try parsing as Date and convert to ISO
    try {
      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error parsing date:', cleanDate, error);
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getStatistics() {
    const transactions = this.getTransactions();
    const totalTransactions = transactions.length;
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalTransactions,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      dataSize: JSON.stringify(this.data).length,
      lastUpdate: this.data.settings.lastUpdate
    };
  }

  getCashflowSettings(): CashflowSettings {
    return this.data.moduleData?.cashflowSettings ?? {};
  }

  setManualAvailable(period: string, value: number | null): void {
    if (!this.data.moduleData) this.data.moduleData = {};
    const settings: CashflowSettings = { ...(this.data.moduleData.cashflowSettings ?? {}) };
    const manual = { ...(settings.manualAvailableByPeriod ?? {}) };
    if (value === null) {
      delete manual[period];
    } else {
      manual[period] = value;
    }
    settings.manualAvailableByPeriod = manual;
    this.data.moduleData.cashflowSettings = settings;
    this.saveData();
  }

  getBudgetCategoryOrderMap(): Record<string, string[]> {
    return this.data.moduleData?.budgetCategoryOrder ?? {};
  }

  setBudgetCategoryOrderMap(value: Record<string, string[]>): void {
    if (!this.data.moduleData) this.data.moduleData = {};
    this.data.moduleData.budgetCategoryOrder = value;
    this.saveData();
  }

  getBudgetConceptOrderMap(): Record<string, string[]> {
    return this.data.moduleData?.budgetConceptOrder ?? {};
  }

  setBudgetConceptOrderMap(value: Record<string, string[]>): void {
    if (!this.data.moduleData) this.data.moduleData = {};
    this.data.moduleData.budgetConceptOrder = value;
    this.saveData();
  }

  getUserPreferences(): FinanceUserPreferences {
    return this.data.moduleData?.userPreferences ?? {};
  }

  setUserPreferences(value: FinanceUserPreferences): void {
    if (!this.data.moduleData) this.data.moduleData = {};
    this.data.moduleData.userPreferences = { ...value, updatedAt: new Date().toISOString() };
    this.saveData();
  }

  // Bank management methods
  addBank(bank: Omit<Bank, 'id'>): Bank {
    const newBank: Bank = {
      ...bank,
      id: this.generateId(),
      custom: true
    };
    this.data.banks.push(newBank);
    this.saveData();
    return newBank;
  }

  getBanks(): Bank[] {
    return [...this.data.banks];
  }

  updateBank(id: string, updates: Partial<Bank>): boolean {
    const index = this.data.banks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.data.banks[index] = { ...this.data.banks[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteBank(id: string): boolean {
    const bankIndex = this.data.banks.findIndex(b => b.id === id);
    if (bankIndex !== -1) {
      // Delete associated accounts
      this.data.accounts = this.data.accounts.filter(a => a.bankId !== id);
      // Remove bank references from transactions
      this.data.transactions = this.data.transactions.map(t => 
        t.bankId === id ? { ...t, bankId: undefined } : t
      );
      this.data.banks.splice(bankIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Account management methods
  addAccount(account: Omit<Account, 'id'>): Account {
    const newAccount: Account = {
      ...account,
      id: this.generateId(),
      currency: account.currency || 'USD',
      custom: true
    };
    this.data.accounts.push(newAccount);
    this.saveData();
    return newAccount;
  }

  getAccounts(): Account[] {
    return [...this.data.accounts];
  }

  getAccountsByBank(bankId: string): Account[] {
    return this.data.accounts.filter(a => a.bankId === bankId);
  }

  updateAccount(id: string, updates: Partial<Account>): boolean {
    const index = this.data.accounts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.data.accounts[index] = { ...this.data.accounts[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteAccount(id: string): boolean {
    const accountIndex = this.data.accounts.findIndex(a => a.id === id);
    if (accountIndex !== -1) {
      // Remove account references from transactions
      this.data.transactions = this.data.transactions.map(t => 
        t.accountId === id ? { ...t, accountId: undefined } : t
      );
      this.data.accounts.splice(accountIndex, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Category management methods
  addCategory(category: Omit<Category, 'id'>): Category {
    const newCategory: Category = {
      ...category,
      id: this.generateId(),
      custom: true
    };
    this.data.categories[category.type].push(newCategory);
    this.saveData();
    return newCategory;
  }

  getCategories(type?: 'income' | 'expense'): Category[] {
    if (type) {
      return [...this.data.categories[type]];
    }
    return [...this.data.categories.income, ...this.data.categories.expense];
  }

  updateCategory(id: string, updates: Partial<Category>): boolean {
    for (const type of ['income', 'expense'] as const) {
      const index = this.data.categories[type].findIndex(c => c.id === id);
      if (index !== -1) {
        this.data.categories[type][index] = { ...this.data.categories[type][index], ...updates };
        this.saveData();
        return true;
      }
    }
    return false;
  }

  deleteCategory(id: string): boolean {
    for (const type of ['income', 'expense'] as const) {
      const index = this.data.categories[type].findIndex(c => c.id === id);
      if (index !== -1) {
        // Update transactions to use a default category
        const defaultCategory = this.data.categories[type].find(c => c.custom === false);
        this.data.transactions = this.data.transactions.map(t => 
          t.category === this.data.categories[type][index].name 
            ? { ...t, category: defaultCategory?.name || 'Otros' }
            : t
        );
        this.data.categories[type].splice(index, 1);
        this.saveData();
        return true;
      }
    }
    return false;
  }

  // Budget management methods
  createBudget(period: string, categories: { [categoryId: string]: number }): Budget {
    const budget: Budget = {
      id: this.generateId(),
      period,
      categories: Object.fromEntries(
        Object.entries(categories).map(([id, amount]) => [id, { budgeted: amount, actual: 0 }])
      ),
      created: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };
    
    this.data.budgets[period] = budget;
    this.saveData();
    return budget;
  }

  getBudget(period: string): Budget | undefined {
    return this.data.budgets[period];
  }

  updateBudgetActuals(period: string): void {
    const budget = this.data.budgets[period];
    if (!budget) return;

    const transactions = this.getTransactions(period);
    
    // Reset actuals
    Object.keys(budget.categories).forEach(categoryId => {
      budget.categories[categoryId].actual = 0;
    });

    // Calculate actuals from transactions
    transactions.forEach(transaction => {
      const category = this.getCategories().find(c => c.name === transaction.category);
      if (category && budget.categories[category.id]) {
        if (transaction.type === 'expense') {
          budget.categories[category.id].actual += transaction.amount;
        }
      }
    });

    budget.lastUpdate = new Date().toISOString();
    this.saveData();
  }

  getAllBudgets(): Budget[] {
    return Object.values(this.data.budgets);
  }

  deleteBudget(period: string): boolean {
    if (this.data.budgets[period]) {
      delete this.data.budgets[period];
      this.saveData();
      return true;
    }
    return false;
  }

  getCategorySubcategoryOptions(type: 'income' | 'expense'): CategorySubcategoryOption[] {
    const byCategory = new Map<string, Set<string>>();

    // Priorizar categorías jerárquicas guardadas en `financial_categories`.
    const legacyCategoriesRaw = localStorage.getItem('financial_categories');
    if (legacyCategoriesRaw) {
      try {
        const legacyCategories = JSON.parse(legacyCategoriesRaw) as Array<{
          id: string;
          name: string;
          type: 'income' | 'expense';
          parentId?: string;
          isActive?: boolean;
        }>;
        const active = legacyCategories.filter(c => c.type === type && c.isActive !== false);
        const idToName = new Map(active.map(c => [c.id, c.name]));
        active.forEach(cat => {
          if (!cat.parentId) {
            if (!byCategory.has(cat.name)) byCategory.set(cat.name, new Set());
          }
        });
        active.forEach(cat => {
          if (cat.parentId) {
            const parentName = idToName.get(cat.parentId);
            if (!parentName) return;
            if (!byCategory.has(parentName)) byCategory.set(parentName, new Set());
            byCategory.get(parentName)?.add(cat.name);
          }
        });
      } catch (error) {
        console.error('Error reading category hierarchy:', error);
      }
    }

    if (byCategory.size === 0) {
      this.data.categories[type].forEach(c => {
        const parent = c.parent?.trim() || c.name;
        if (!byCategory.has(parent)) byCategory.set(parent, new Set());
        if (c.parent && c.parent.trim().length > 0) {
          byCategory.get(parent)?.add(c.name);
        }
      });
    }

    return Array.from(byCategory.entries()).map(([category, subs]) => ({
      category,
      subcategories: Array.from(subs).sort((a, b) => a.localeCompare(b)),
    }));
  }

  addDebt(input: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Debt {
    const now = new Date().toISOString();
    const debt: Debt = {
      ...input,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.debts = [...(this.data.debts || []), debt];
    this.saveData();
    return debt;
  }

  getDebts(): Debt[] {
    return [...(this.data.debts || [])];
  }

  updateDebt(id: string, updates: Partial<Debt>): boolean {
    const debts = this.data.debts || [];
    const idx = debts.findIndex(d => d.id === id);
    if (idx === -1) return false;
    debts[idx] = {
      ...debts[idx],
      ...updates,
      id: debts[idx].id,
      updatedAt: new Date().toISOString(),
    };
    this.data.debts = debts;
    this.saveData();
    return true;
  }

  deleteDebt(id: string): boolean {
    const debts = this.data.debts || [];
    const next = debts.filter(d => d.id !== id);
    if (next.length === debts.length) return false;
    this.data.debts = next;
    this.data.amortizationSchedules = (this.data.amortizationSchedules || []).filter(s => s.debtId !== id);
    this.saveData();
    return true;
  }

  addCreditCard(input: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): CreditCard {
    const now = new Date().toISOString();
    const card: CreditCard = {
      ...input,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.creditCards = [...(this.data.creditCards || []), card];
    this.saveData();
    return card;
  }

  getCreditCards(): CreditCard[] {
    return [...(this.data.creditCards || [])];
  }

  updateCreditCard(id: string, updates: Partial<CreditCard>): boolean {
    const cards = this.data.creditCards || [];
    const idx = cards.findIndex(c => c.id === id);
    if (idx === -1) return false;
    cards[idx] = {
      ...cards[idx],
      ...updates,
      id: cards[idx].id,
      updatedAt: new Date().toISOString(),
    };
    this.data.creditCards = cards;
    this.saveData();
    return true;
  }

  deleteCreditCard(id: string): boolean {
    const cards = this.data.creditCards || [];
    const next = cards.filter(c => c.id !== id);
    if (next.length === cards.length) return false;
    this.data.creditCards = next;
    this.saveData();
    return true;
  }

  generateAmortizationSchedule(
    debtId: string,
    paymentsCount: number,
    firstPaymentDate: string
  ): AmortizationSchedule[] {
    const debt = (this.data.debts || []).find(d => d.id === debtId);
    if (!debt || paymentsCount <= 0) return [];

    const monthlyRate = debt.interestRateAnnual / 12 / 100;
    const paymentAmount = monthlyRate === 0
      ? debt.principalAmount / paymentsCount
      : (debt.principalAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -paymentsCount));

    let remaining = debt.principalAmount;
    const baseDate = new Date(firstPaymentDate);
    const schedule: AmortizationSchedule[] = [];

    for (let i = 1; i <= paymentsCount; i += 1) {
      const interestPortion = remaining * monthlyRate;
      const principalPortion = Math.min(remaining, paymentAmount - interestPortion);
      remaining = Math.max(0, remaining - principalPortion);

      const paymentDate = new Date(baseDate);
      paymentDate.setMonth(paymentDate.getMonth() + (i - 1));

      schedule.push({
        id: this.generateId(),
        debtId,
        installmentNumber: i,
        paymentDate: paymentDate.toISOString().split('T')[0],
        paymentAmount: Number(paymentAmount.toFixed(2)),
        principalPortion: Number(principalPortion.toFixed(2)),
        interestPortion: Number(interestPortion.toFixed(2)),
        remainingPrincipal: Number(remaining.toFixed(2)),
        currency: debt.currency,
        paid: false,
      });
    }

    this.data.amortizationSchedules = [
      ...(this.data.amortizationSchedules || []).filter(s => s.debtId !== debtId),
      ...schedule,
    ];
    this.saveData();
    return schedule;
  }

  getAmortizationSchedulesByDebt(debtId: string): AmortizationSchedule[] {
    return (this.data.amortizationSchedules || [])
      .filter(s => s.debtId === debtId)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  markAmortizationInstallmentPaid(scheduleId: string, paid: boolean): boolean {
    const schedules = this.data.amortizationSchedules || [];
    const idx = schedules.findIndex(s => s.id === scheduleId);
    if (idx === -1) return false;
    schedules[idx] = { ...schedules[idx], paid };
    this.data.amortizationSchedules = schedules;
    this.saveData();
    return true;
  }

  getCounterparties(): Counterparty[] {
    return this.getModuleData<Counterparty>('counterparties');
  }

  addCounterparty(input: Omit<Counterparty, 'id'>): Counterparty {
    const row: Counterparty = { ...input, id: this.generateId() };
    const list = this.getCounterparties();
    this.setModuleData('counterparties', [...list, row]);
    return row;
  }

  updateCounterparty(id: string, updates: Partial<Omit<Counterparty, 'id'>>): boolean {
    const list = this.getCounterparties();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates, id };
    this.setModuleData('counterparties', list);
    return true;
  }

  deleteCounterparty(id: string): boolean {
    const list = this.getCounterparties();
    const next = list.filter((c) => c.id !== id);
    if (next.length === list.length) return false;
    this.setModuleData('counterparties', next);
    return true;
  }

  /** Coincidencia parcial (como la nota en Sheets) sobre el concepto. */
  matchCounterpartyRules(
    description: string,
    txType: 'income' | 'expense' | 'transfer'
  ): Partial<Pick<EnhancedTransaction, 'category' | 'subcategory' | 'notes'>> {
    const rules = this.getCounterparties().filter((r) => r.txType === txType);
    const lower = description.toLowerCase();
    for (const r of rules) {
      if (!r.matchText.trim()) continue;
      if (lower.includes(r.matchText.toLowerCase())) {
        return {
          category: r.category,
          subcategory: r.subcategory,
          notes: r.notes || description,
        };
      }
    }
    return {};
  }

  applyWorkspaceSeed(seed: WorkspaceSeedData): void {
    const importedDebtNameToId = new Map<string, string>();

    if (seed.banks && seed.banks.length > 0) {
      this.data.banks = seed.banks.map((bank) => ({
        ...bank,
        id: this.generateId(),
      }));
    }

    if (seed.accounts && seed.accounts.length > 0) {
      const bankByName = new Map(this.data.banks.map((bank) => [bank.name, bank.id]));
      this.data.accounts = seed.accounts.map((account) => ({
        ...account,
        id: this.generateId(),
        bankId: bankByName.get(account.bankId) || account.bankId || this.data.banks[0]?.id || 'bank_1',
      }));
    }

    if (seed.transactions && seed.transactions.length > 0) {
      this.data.transactions = seed.transactions.map((transaction) => ({
        ...transaction,
        id: this.generateId(),
        timestamp: new Date().toISOString(),
      }));
    }

    if (seed.debts && seed.debts.length > 0) {
      this.data.debts = seed.debts.map((debt) => ({
        ...debt,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      this.data.debts.forEach((debt) => importedDebtNameToId.set(debt.name, debt.id));
    }

    if (seed.creditCards && seed.creditCards.length > 0) {
      this.data.creditCards = seed.creditCards.map((card) => ({
        ...card,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    if (seed.amortizationSchedules && seed.amortizationSchedules.length > 0) {
      this.data.amortizationSchedules = seed.amortizationSchedules.map((schedule) => {
        const { debtName, ...restSchedule } = schedule;
        return {
          ...restSchedule,
          debtId:
            schedule.debtId ||
            (debtName ? importedDebtNameToId.get(debtName) : undefined) ||
            this.data.debts?.[0]?.id ||
            '',
          id: this.generateId(),
        };
      });
    }

    if (seed.moduleData) {
      this.data.moduleData = {
        ...(this.data.moduleData || {}),
        ...seed.moduleData,
      };
      this.restoreModuleDataToLocalStorage();
    }

    this.saveData();
  }
}