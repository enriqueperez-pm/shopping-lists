"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";

function shiftMonth(period: string, delta: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

type Props = {
  variant?: "card" | "inline";
};

export default function MonthSelector({ variant = "card" }: Props) {
  const { selectedPeriod, setSelectedPeriod } = useFinance();

  const controls = (
    <>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-[rgb(var(--ink-rgb) / 0.03)] text-ink-faint"
        onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold capitalize text-ink min-w-[9rem] text-center">
        {labelMonth(selectedPeriod)}
      </span>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-[rgb(var(--ink-rgb) / 0.03)] text-ink-faint"
        onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </>
  );

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-0.5 rounded-xl border border-[var(--border-hairline)] bg-[rgb(var(--ink-rgb)/0.03)] px-1 py-0.5">
        <button
          type="button"
          className="p-1 rounded-lg hover:bg-[rgb(var(--ink-rgb)/0.06)] text-ink-faint"
          onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, -1))}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold capitalize text-ink min-w-[7.5rem] text-center">
          {labelMonth(selectedPeriod)}
        </span>
        <button
          type="button"
          className="p-1 rounded-lg hover:bg-[rgb(var(--ink-rgb)/0.06)] text-ink-faint"
          onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, 1))}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 surface-soft px-3 py-2">
      {controls}
    </div>
  );
}
