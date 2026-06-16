"use client";

import { useMemo } from "react";
import { useFinance } from "./FinancialDbProvider";
import { getBudgetConcepts } from "./finance-linking";
import { buildPeriodCashflow } from "./cashflow-analytics";

export function useCashflow() {
  const { db, transactions, selectedPeriod } = useFinance();

  return useMemo(() => {
    const settings = db.getCashflowSettings();
    const manualOverride = settings.manualAvailableByPeriod?.[selectedPeriod] ?? null;
    const concepts = getBudgetConcepts(db);
    return buildPeriodCashflow({
      transactions: db.getTransactions(),
      concepts,
      selectedPeriod,
      manualOverride,
    });
  }, [db, transactions, selectedPeriod]);
}
