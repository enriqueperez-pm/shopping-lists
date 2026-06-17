"use client";

import { useCallback, useEffect, useState } from "react";
import type { FinanceUserPreferences } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import { readBudgetUiState, writeBudgetUiState } from "./budget-ui-state";

export function useFinancePreferences() {
  const { db, cloudHydrated } = useFinance();
  const [prefs, setPrefsState] = useState<FinanceUserPreferences>(() => db.getUserPreferences());

  const patch = useCallback(
    (next: Partial<FinanceUserPreferences>) => {
      const merged = { ...db.getUserPreferences(), ...next };
      db.setUserPreferences(merged);
      setPrefsState(merged);
      if (merged.collapsedSections || merged.showEmptyConcepts !== undefined) {
        writeBudgetUiState({
          collapsed: merged.collapsedSections ?? {},
          showEmptyConcepts: merged.showEmptyConcepts,
        });
      }
    },
    [db],
  );

  useEffect(() => {
    if (!cloudHydrated) return;
    const local = readBudgetUiState();
    const remote = db.getUserPreferences();
    if (local && !remote.collapsedSections && Object.keys(local.collapsed).length > 0) {
      patch({
        collapsedSections: local.collapsed,
        showEmptyConcepts: local.showEmptyConcepts,
      });
      return;
    }
    setPrefsState(db.getUserPreferences());
  }, [cloudHydrated, db, patch]);

  return { prefs, patch };
}
