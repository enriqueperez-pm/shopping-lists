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

export default function MonthSelector() {
  const { selectedPeriod, setSelectedPeriod } = useFinance();

  return (
    <div className="flex items-center justify-between gap-2 surface-soft px-3 py-2">
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-[rgba(21,49,49,0.03)] text-ink-faint"
        onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold capitalize text-ink">{labelMonth(selectedPeriod)}</span>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-[rgba(21,49,49,0.03)] text-ink-faint"
        onClick={() => setSelectedPeriod(shiftMonth(selectedPeriod, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
