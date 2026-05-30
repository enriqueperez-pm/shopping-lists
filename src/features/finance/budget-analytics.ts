import type { BudgetConcept } from "./types";
import type { EnhancedTransaction } from "./FinancialDatabase";

type CurrencyCode = 'USD' | 'MXN' | 'EUR';

export type BudgetHealthStatus = 'healthy' | 'warning' | 'critical' | 'no-data';

export interface BudgetConceptAnalysis {
  concept: BudgetConcept;
  actual: number;
  budgeted: number;
  variance: number;
  variancePct: number;
  usagePct: number;
  txCount: number;
  status: BudgetHealthStatus;
  isPositiveVariance: boolean;
}

export interface BudgetCurrencySummary {
  currency: CurrencyCode;
  budgeted: number;
  actual: number;
  variance: number;
}

export interface BudgetAnalyticsResult {
  periodConcepts: BudgetConcept[];
  leafAnalyses: BudgetConceptAnalysis[];
  parentAnalyses: BudgetConceptAnalysis[];
  totalsByCurrency: BudgetCurrencySummary[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    noData: number;
  };
}

interface BuildBudgetAnalyticsInput {
  concepts: BudgetConcept[];
  transactions: EnhancedTransaction[];
  selectedPeriod: string;
  convert?: (amount: number, from: string, to: string) => number;
}

const isConceptInPeriod = (concept: BudgetConcept, selectedPeriod: string) =>
  selectedPeriod === 'all' || concept.period === selectedPeriod;

const isTransactionInPeriod = (transaction: EnhancedTransaction, selectedPeriod: string) =>
  selectedPeriod === 'all' || transaction.date.startsWith(selectedPeriod);

const resolveTransactionAmountForCurrency = (
  transaction: EnhancedTransaction,
  targetCurrency: CurrencyCode,
  convert?: (amount: number, from: string, to: string) => number
) => {
  const sourceCurrency = (transaction.originalCurrency || 'USD') as CurrencyCode;
  const sourceAmount = transaction.originalAmount ?? transaction.amount;

  if (sourceCurrency === targetCurrency) {
    return sourceAmount;
  }

  if (convert) {
    return convert(sourceAmount, sourceCurrency, targetCurrency);
  }

  // Fallback controlado: si no hay convertidor disponible, mantener amount en USD.
  return transaction.amount;
};

const evaluateStatus = (
  type: BudgetConcept['type'],
  usagePct: number,
  txCount: number
): BudgetHealthStatus => {
  if (txCount === 0) return 'no-data';

  if (type === 'income') {
    if (usagePct >= 100) return 'healthy';
    if (usagePct >= 80) return 'warning';
    return 'critical';
  }

  // expense
  if (usagePct <= 80) return 'healthy';
  if (usagePct <= 100) return 'warning';
  return 'critical';
};

const isPositiveVariance = (type: BudgetConcept['type'], variance: number) => {
  if (type === 'income') return variance >= 0;
  return variance <= 0;
};

const asAnalysis = (
  concept: BudgetConcept,
  actual: number,
  txCount: number
): BudgetConceptAnalysis => {
  const budgeted = concept.budgetedAmount || 0;
  const variance = actual - budgeted;
  const usagePct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : 0;

  return {
    concept,
    actual,
    budgeted,
    variance,
    variancePct,
    usagePct,
    txCount,
    status: evaluateStatus(concept.type, usagePct, txCount),
    isPositiveVariance: isPositiveVariance(concept.type, variance),
  };
};

export function buildBudgetAnalytics({
  concepts,
  transactions,
  selectedPeriod,
  convert,
}: BuildBudgetAnalyticsInput): BudgetAnalyticsResult {
  const periodConcepts = concepts.filter((concept) => isConceptInPeriod(concept, selectedPeriod));
  const periodTransactions = transactions.filter((transaction) =>
    isTransactionInPeriod(transaction, selectedPeriod)
  );

  const leafConcepts = periodConcepts.filter((concept) => !concept.isParent);
  const parentConcepts = periodConcepts.filter((concept) => concept.isParent && !concept.parentId);

  const leafAnalyses = leafConcepts.map((concept) => {
    const linked = periodTransactions.filter(
      (transaction) =>
        transaction.budgetConceptId === concept.id &&
        transaction.type === concept.type,
    );
    const actual = linked.reduce(
      (sum, transaction) =>
        sum + resolveTransactionAmountForCurrency(transaction, concept.currency, convert),
      0
    );

    return asAnalysis(concept, actual, linked.length);
  });

  const leafByConceptId = new Map(leafAnalyses.map((analysis) => [analysis.concept.id, analysis]));

  const parentAnalyses = parentConcepts.map((parent) => {
    const children = leafConcepts.filter((concept) => concept.parentId === parent.id);

    if (children.length === 0) {
      return asAnalysis(parent, 0, 0);
    }

    const totals = children.reduce(
      (acc, child) => {
        const childAnalysis = leafByConceptId.get(child.id);
        if (!childAnalysis) return acc;
        acc.actual += childAnalysis.actual;
        acc.budgeted += childAnalysis.budgeted;
        acc.txCount += childAnalysis.txCount;
        return acc;
      },
      { actual: 0, budgeted: 0, txCount: 0 }
    );

    const basis = asAnalysis(parent, totals.actual, totals.txCount);

    return {
      ...basis,
      budgeted: totals.budgeted,
      variance: totals.actual - totals.budgeted,
      usagePct: totals.budgeted > 0 ? (totals.actual / totals.budgeted) * 100 : 0,
      variancePct: totals.budgeted > 0 ? ((totals.actual - totals.budgeted) / totals.budgeted) * 100 : 0,
      status: evaluateStatus(parent.type, totals.budgeted > 0 ? (totals.actual / totals.budgeted) * 100 : 0, totals.txCount),
      isPositiveVariance: isPositiveVariance(parent.type, totals.actual - totals.budgeted),
      txCount: totals.txCount,
    };
  });

  const totalsByCurrencyMap = new Map<CurrencyCode, BudgetCurrencySummary>();
  for (const analysis of leafAnalyses) {
    const currency = analysis.concept.currency as CurrencyCode;
    const existing = totalsByCurrencyMap.get(currency) || {
      currency,
      budgeted: 0,
      actual: 0,
      variance: 0,
    };
    existing.budgeted += analysis.budgeted;
    existing.actual += analysis.actual;
    existing.variance += analysis.variance;
    totalsByCurrencyMap.set(currency, existing);
  }

  const summary = leafAnalyses.reduce(
    (acc, analysis) => {
      acc.total += 1;
      if (analysis.status === 'healthy') acc.healthy += 1;
      if (analysis.status === 'warning') acc.warning += 1;
      if (analysis.status === 'critical') acc.critical += 1;
      if (analysis.status === 'no-data') acc.noData += 1;
      return acc;
    },
    { total: 0, healthy: 0, warning: 0, critical: 0, noData: 0 }
  );

  return {
    periodConcepts,
    leafAnalyses,
    parentAnalyses,
    totalsByCurrency: Array.from(totalsByCurrencyMap.values()),
    summary,
  };
}

