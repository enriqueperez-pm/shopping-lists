export type ShoppingFilter = "all" | "pantry" | "needed" | "in_cart" | "purchased";

const STORAGE_KEY = "shopping-ui-state-v1";

export type ShoppingUiState = {
  search: string;
  listaSearch: string;
  filter: ShoppingFilter;
  collapsed: Record<string, boolean>;
};

export function readShoppingUiState(): ShoppingUiState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ShoppingUiState & { tab?: string }>;
    const filter: ShoppingFilter =
      parsed.filter === "pantry" ||
      parsed.filter === "needed" ||
      parsed.filter === "in_cart" ||
      parsed.filter === "purchased"
        ? parsed.filter
        : "all";
    return {
      search: typeof parsed.search === "string" ? parsed.search : "",
      listaSearch: typeof parsed.listaSearch === "string" ? parsed.listaSearch : "",
      filter,
      collapsed: parsed.collapsed && typeof parsed.collapsed === "object" ? parsed.collapsed : {},
    };
  } catch {
    return null;
  }
}

export function writeShoppingUiState(state: ShoppingUiState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
