"use client";

import { useCallback, useEffect, useState } from "react";

export type ActionsSide = "left" | "right";

const STORAGE_KEY = "card-actions-side";

function readSide(): ActionsSide {
  if (typeof window === "undefined") return "right";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "left" ? "left" : "right";
}

export function useCardLayout() {
  const [actionsSide, setActionsSide] = useState<ActionsSide>("right");

  useEffect(() => {
    setActionsSide(readSide());
  }, []);

  const toggleActionsSide = useCallback(() => {
    setActionsSide((prev) => {
      const next: ActionsSide = prev === "right" ? "left" : "right";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { actionsSide, toggleActionsSide };
}
