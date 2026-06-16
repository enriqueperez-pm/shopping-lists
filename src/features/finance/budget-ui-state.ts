const STORAGE_KEY = "budget-ui-state-v1";

export type BudgetUiState = {
  collapsed: Record<string, boolean>;
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
    };
  } catch {
    return null;
  }
}

export function writeBudgetUiState(state: BudgetUiState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
