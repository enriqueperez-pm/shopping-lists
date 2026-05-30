export interface BudgetConcept {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  budgetedAmount: number;
  actualAmount: number;
  currency: "MXN" | "USD" | "EUR";
  period: string;
  type: "income" | "expense";
  isFixed: boolean;
  description?: string;
  parentId?: string;
  isParent: boolean;
  children?: BudgetConcept[];
  createdAt: string;
  updatedAt: string;
}
