"use client";

import { useMemo, useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import QuickExpenseModal from "./QuickExpenseModal";
import { money } from "@/lib/money";
import { Plus } from "lucide-react";

export default function GastosView() {
  const { transactions, selectedPeriod } = useFinance();
  const [showForm, setShowForm] = useState(false);

  const monthTx = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.type === "expense" && tx.date.startsWith(selectedPeriod),
      ),
    [transactions, selectedPeriod],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 pb-24"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}>
      <div>
        <h1 className="text-title">Gastos</h1>
        <p className="text-caption">Movimientos del mes</p>
      </div>

      <MonthSelector />

      <button type="button" className="btn-primary w-full justify-center" onClick={() => setShowForm(true)}>
        <Plus size={14} />
        Gasto rápido
      </button>

      <div className="space-y-2">
        {monthTx.length === 0 ? (
          <p className="text-caption">Sin gastos registrados.</p>
        ) : (
          monthTx.map((tx) => (
            <div key={tx.id} className="surface-soft px-3 py-2.5 flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{tx.description}</p>
                <p className="text-micro text-ink-faint">
                  {tx.date}
                  {tx.source === "shopping_trip" && (
                    <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                      super
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums shrink-0">{money(tx.amount)}</p>
            </div>
          ))
        )}
      </div>

      {showForm && <QuickExpenseModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
