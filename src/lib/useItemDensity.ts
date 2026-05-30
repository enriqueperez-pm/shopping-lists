"use client";

import { useCallback, useEffect, useState } from "react";

export type ItemDensity = "compact" | "expanded";

const STORAGE_KEY = "item-view-density";

function readDensity(): ItemDensity {
  if (typeof window === "undefined") return "expanded";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "compact" ? "compact" : "expanded";
}

export function useItemDensity() {
  const [density, setDensity] = useState<ItemDensity>("expanded");

  useEffect(() => {
    setDensity(readDensity());
  }, []);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => {
      const next: ItemDensity = prev === "compact" ? "expanded" : "compact";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { density, toggleDensity, isCompact: density === "compact" };
}
