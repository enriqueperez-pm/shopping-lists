import type { BudgetConceptAnalysis } from "./budget-analytics";
import type { BudgetConcept } from "./types";
import { normalizeValue } from "./finance-linking";

/** Normaliza identidad canónica (aliases post-migración taxonomía). */
export function canonicalConceptIdentity(
  concept: Pick<BudgetConcept, "category" | "subcategory" | "name">,
) {
  let cat = normalizeValue(concept.category);
  let sub = normalizeValue(concept.subcategory || "");
  let name = normalizeValue(concept.name);

  if (sub === "despensa" || name === "despensa") {
    sub = "supermercado";
    if (name === "despensa") name = "supermercado";
  }
  if (sub === "restaurantes") {
    sub = "salidas";
    cat = normalizeValue("Entretenimiento");
  }
  if (name === "internet" || name === "internet telmex") {
    name = "telmex";
  }
  if (sub === "internet" && (name === "internet" || name.includes("telmex"))) {
    name = "telmex";
  }

  return { cat, sub, name };
}

/** Clave única por periodo + tipo + categoría + sub + nombre. */
export function canonicalConceptKey(concept: BudgetConcept): string {
  const { cat, sub, name } = canonicalConceptIdentity(concept);
  return `${concept.period}::${concept.type}::${cat}::${sub}::${name}`;
}

/** Clave lógica sin periodo (para pickers). */
export function logicalConceptKey(concept: BudgetConcept): string {
  const { cat, sub, name } = canonicalConceptIdentity(concept);
  return `${concept.type}::${cat}::${sub}::${name}`;
}

function pickPreferredConcept(a: BudgetConcept, b: BudgetConcept, preferredPeriod?: string): BudgetConcept {
  if (preferredPeriod) {
    if (a.period === preferredPeriod && b.period !== preferredPeriod) return a;
    if (b.period === preferredPeriod && a.period !== preferredPeriod) return b;
  }
  const aBrain = a.id.startsWith("brain_");
  const bBrain = b.id.startsWith("brain_");
  if (aBrain && !bBrain) return a;
  if (bBrain && !aBrain) return b;
  if ((a.budgetedAmount || 0) !== (b.budgetedAmount || 0)) {
    return (a.budgetedAmount || 0) >= (b.budgetedAmount || 0) ? a : b;
  }
  return new Date(a.createdAt).getTime() <= new Date(b.createdAt).getTime() ? a : b;
}

export function dedupeBudgetConceptList(
  concepts: BudgetConcept[],
  options?: { preferredPeriod?: string; samePeriodOnly?: boolean },
): BudgetConcept[] {
  const map = new Map<string, BudgetConcept>();
  for (const concept of concepts) {
    if (concept.isParent) continue;
    const key = options?.samePeriodOnly === false ? logicalConceptKey(concept) : canonicalConceptKey(concept);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, concept);
      continue;
    }
    map.set(key, pickPreferredConcept(existing, concept, options?.preferredPeriod));
  }
  return [...map.values()];
}

export function dedupeLeafAnalysesForPeriod(
  analyses: BudgetConceptAnalysis[],
  period: string,
): BudgetConceptAnalysis[] {
  const map = new Map<string, BudgetConceptAnalysis>();
  for (const row of analyses) {
    if (row.concept.period !== period) continue;
    const key = canonicalConceptKey(row.concept);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const keepConcept = pickPreferredConcept(existing.concept, row.concept, period);
    const drop = keepConcept.id === existing.concept.id ? row : existing;
    const keep = keepConcept.id === existing.concept.id ? existing : row;
    const budgeted = Math.max(keep.budgeted, drop.budgeted);
    const actual = keep.actual + drop.actual;
    map.set(key, {
      ...keep,
      actual,
      budgeted,
      variance: actual - budgeted,
      usagePct: budgeted > 0 ? (actual / budgeted) * 100 : 0,
      txCount: keep.txCount + drop.txCount,
    });
  }
  return [...map.values()];
}

export function listCategoriesFromConcepts(
  concepts: BudgetConcept[],
  type: "income" | "expense",
): string[] {
  const set = new Set<string>();
  for (const c of concepts) {
    if (c.type === type && !c.isParent) set.add(c.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}
