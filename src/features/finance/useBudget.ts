"use client";

import { useMemo } from "react";
import { useFinance } from "./FinancialDbProvider";
import { buildBudgetAnalytics } from "./budget-analytics";
import { getBudgetConcepts } from "./finance-linking";
import type { BudgetConcept } from "./types";

export function useBudgetAnalytics() {
  const { db, transactions, selectedPeriod } = useFinance();
  return useMemo(() => {
    const concepts = getBudgetConcepts(db);
    return buildBudgetAnalytics({ concepts, transactions, selectedPeriod });
  }, [db, transactions, selectedPeriod]);
}

export function useBudgetConcepts() {
  const { db, selectedPeriod } = useFinance();
  return useMemo(
    () => getBudgetConcepts(db).filter((c) => c.period === selectedPeriod),
    [db, selectedPeriod],
  );
}

export function persistConcepts(db: ReturnType<typeof useFinance>["db"], next: BudgetConcept[]) {
  db.setModuleData("budgetConcepts", next);
}
