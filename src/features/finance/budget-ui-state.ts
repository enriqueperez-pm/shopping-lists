const STORAGE_KEY = "budget-ui-state-v1";

export type BudgetUiState = {
  collapsed: Record<string, boolean>;
  /** Muestra conceptos sin presupuesto ni gasto (colapsado por defecto). */
  showEmptyConcepts?: boolean;
};

export function readBudgetUiState(): BudgetUiState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BudgetUiState>;
    return {
      collapsed:
        parsed.collapsed && typeof parsed.collapsed === "object" ? parsed.collapsed : {},
      showEmptyConcepts: parsed.showEmptyConcepts === true,
    };
  } catch {
    return null;
  }
}

export function writeBudgetUiState(state: BudgetUiState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Tiene presupuesto asignado o movimiento real en el mes. */
export function isActiveBudgetConcept(row: { budgeted: number; actual: number }): boolean {
  return row.budgeted > 0 || row.actual > 0;
}
