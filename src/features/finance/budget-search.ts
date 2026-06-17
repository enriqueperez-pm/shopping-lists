import type { BudgetConceptAnalysis } from "./budget-analytics";
import type { EnhancedTransaction } from "./FinancialDatabase";
import { movementCategoryLabel } from "./cashflow-analytics";
import { normalizeValue } from "./finance-linking";

export function normalizeSearchQuery(query: string): string {
  return normalizeValue(query);
}

export function conceptMatchesQuery(
  concept: { name: string; category: string; subcategory?: string },
  query: string,
): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const haystack = [concept.name, concept.category, concept.subcategory ?? ""].join(" ");
  return normalizeValue(haystack).includes(q);
}

export function transactionMatchesQuery(tx: EnhancedTransaction, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const tag = movementCategoryLabel(tx) ?? "";
  const haystack = [
    tx.description,
    tx.category,
    tx.subcategory ?? "",
    tag,
    tx.date,
    String(tx.amount),
    String(tx.originalAmount ?? ""),
  ].join(" ");
  return normalizeValue(haystack).includes(q);
}

type CategoryGroup = {
  parent: BudgetConceptAnalysis;
  children: BudgetConceptAnalysis[];
};

export function filterBudgetCategoryGroups(
  groups: CategoryGroup[],
  query: string,
): CategoryGroup[] {
  const q = normalizeSearchQuery(query);
  if (!q) return groups;

  return groups
    .map((group) => {
      const parentMatch = conceptMatchesQuery(group.parent.concept, q);
      const children = parentMatch
        ? group.children
        : group.children.filter((c) => conceptMatchesQuery(c.concept, q));
      if (parentMatch || children.length > 0) {
        return { ...group, children };
      }
      return null;
    })
    .filter((g): g is CategoryGroup => g != null);
}

export function filterConceptRows(
  rows: BudgetConceptAnalysis[],
  query: string,
): BudgetConceptAnalysis[] {
  const q = normalizeSearchQuery(query);
  if (!q) return rows;
  return rows.filter((row) => conceptMatchesQuery(row.concept, q));
}

export function filterTransactions(
  txs: EnhancedTransaction[],
  query: string,
): EnhancedTransaction[] {
  const q = normalizeSearchQuery(query);
  if (!q) return txs;
  return txs.filter((tx) => transactionMatchesQuery(tx, query));
}

export function sectionKeysMatchingSearch(
  groups: CategoryGroup[],
  query: string,
  tab: string,
): Set<string> {
  const q = normalizeSearchQuery(query);
  const keys = new Set<string>();
  if (!q) return keys;
  for (const group of groups) {
    const key = `budget:${tab}:${group.parent.concept.id}`;
    const parentMatch = conceptMatchesQuery(group.parent.concept, q);
    const childMatch = group.children.some((c) => conceptMatchesQuery(c.concept, q));
    if (parentMatch || childMatch) keys.add(key);
  }
  return keys;
}
