"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useFinance } from "./FinancialDbProvider";
import { useCashflow } from "./useCashflow";
import MonthSelector from "./MonthSelector";
import QuickExpenseModal from "./QuickExpenseModal";
import QuickIncomeModal from "./QuickIncomeModal";
import MovementRow from "./components/MovementRow";

type MovFilter = "all" | "out" | "in";

export default function GastosView() {
  const cashflow = useCashflow();
  const [filter, setFilter] = useState<MovFilter>("all");
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);

  const list = useMemo(() => {
    return cashflow.allMovements.filter((tx) => {
      if (filter === "in") return tx.type === "income";
      if (filter === "out") return tx.type === "expense";
      return true;
    });
  }, [cashflow.allMovements, filter]);

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad-compact"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
    >
      <PageHeader title="Gastos" subtitle="Movimientos del mes" />

      <MonthSelector />

      <div className="flex border-b border-[var(--border-hairline)]">
        <button
          type="button"
          className={filter === "all" ? "app-tab-active" : "app-tab"}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          type="button"
          className={filter === "out" ? "app-tab-active" : "app-tab"}
          onClick={() => setFilter("out")}
        >
          Salidas
        </button>
        <button
          type="button"
          className={filter === "in" ? "app-tab-active" : "app-tab"}
          onClick={() => setFilter("in")}
        >
          Entradas
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-primary justify-center" onClick={() => setShowExpense(true)}>
          <Plus size={14} />
          Gasto
        </button>
        <button type="button" className="btn-soft justify-center" onClick={() => setShowIncome(true)}>
          <Plus size={14} />
          Ingreso
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-caption">Sin movimientos con este filtro.</p>
        ) : (
          list.map((tx) => <MovementRow key={tx.id} tx={tx} />)
        )}
      </div>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {showIncome && <QuickIncomeModal onClose={() => setShowIncome(false)} />}
    </div>
  );
}
