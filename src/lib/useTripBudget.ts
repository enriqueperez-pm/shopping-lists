"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "shopping-trip-budget-v1";

/** Tope típico basado en ticket Chedraui abril 2026 (~$4,071). */
export const DEFAULT_TRIP_BUDGET = 4000;

type StoredBudget = {
  amount: number | null;
};

function readBudget(): number | null {
  if (typeof window === "undefined") return DEFAULT_TRIP_BUDGET;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_TRIP_BUDGET;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredBudget>;
    if (parsed.amount === null) return null;
    if (typeof parsed.amount === "number" && parsed.amount > 0) return parsed.amount;
    return DEFAULT_TRIP_BUDGET;
  } catch {
    return DEFAULT_TRIP_BUDGET;
  }
}

export function useTripBudget() {
  const [budget, setBudgetState] = useState<number | null>(DEFAULT_TRIP_BUDGET);

  useEffect(() => {
    setBudgetState(readBudget());
  }, []);

  const setBudget = useCallback((amount: number | null) => {
    const next = amount !== null && amount > 0 ? amount : null;
    setBudgetState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ amount: next }));
  }, []);

  return {
    budget,
    setBudget,
    hasBudget: budget !== null && budget > 0,
  };
}
