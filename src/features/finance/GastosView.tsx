"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useFinance } from "./FinancialDbProvider";
import { useCashflow } from "./useCashflow";
import MonthSelector from "./MonthSelector";
import QuickExpenseModal from "./QuickExpenseModal";
import QuickIncomeModal from "./QuickIncomeModal";
import EditMovementModal from "./EditMovementModal";
import ConceptCreatorModal from "./ConceptCreatorModal";
import MovementRow from "./components/MovementRow";
import type { EnhancedTransaction } from "./FinancialDatabase";

type MovFilter = "all" | "out" | "in";

export default function GastosView() {
  const cashflow = useCashflow();
  const [filter, setFilter] = useState<MovFilter>("all");
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [creatingConcept, setCreatingConcept] = useState(false);
  const [editingTx, setEditingTx] = useState<EnhancedTransaction | null>(null);

  const list = useMemo(() => {
    return cashflow.allMovements.filter((tx) => {
      if (filter === "in") return tx.type === "income";
      if (filter === "out") return tx.type === "expense";
      return true;
    });
  }, [cashflow.allMovements, filter]);

  return (
    <div
      className="app-scroll-y px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
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

      <button
        type="button"
        className="btn-soft w-full justify-center gap-1"
        onClick={() => setCreatingConcept(true)}
      >
        <Plus size={14} />
        Nuevo concepto (categoría)
      </button>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-caption">Sin movimientos con este filtro.</p>
        ) : (
          list.map((tx) => <MovementRow key={tx.id} tx={tx} onEdit={setEditingTx} />)
        )}
      </div>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {showIncome && <QuickIncomeModal onClose={() => setShowIncome(false)} />}
      {editingTx && <EditMovementModal tx={editingTx} onClose={() => setEditingTx(null)} />}
      {creatingConcept && (
        <ConceptCreatorModal
          type={filter === "in" ? "income" : "expense"}
          onClose={() => setCreatingConcept(false)}
        />
      )}
    </div>
  );
}
