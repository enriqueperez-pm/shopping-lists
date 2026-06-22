"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SearchBar from "@/components/SearchBar";
import SwipeableRow from "@/components/SwipeableRow";
import { useFinance } from "./FinancialDbProvider";
import { useCashflow } from "./useCashflow";
import MonthSelector from "./MonthSelector";
import QuickExpenseModal from "./QuickExpenseModal";
import QuickIncomeModal from "./QuickIncomeModal";
import EditMovementModal from "./EditMovementModal";
import MovementRow from "./components/MovementRow";
import BudgetConceptCrudPanel from "./components/BudgetConceptCrudPanel";
import FinanceSyncBar from "./components/FinanceSyncBar";
import { useFinancePreferences } from "./useFinancePreferences";
import { filterTransactions } from "./budget-search";
import { getBudgetConcepts } from "./finance-linking";
import { movementCategoryLabel } from "./cashflow-analytics";
import type { EnhancedTransaction } from "./FinancialDatabase";

type MovFilter = "all" | "out" | "in";
type ViewTab = "movimientos" | "conceptos";

function movementCategory(tx: EnhancedTransaction, conceptCategoryById: Map<string, string>): string {
  if (tx.budgetConceptId) {
    const fromConcept = conceptCategoryById.get(tx.budgetConceptId);
    if (fromConcept) return fromConcept;
  }
  return movementCategoryLabel(tx) ?? tx.category;
}

export default function GastosView() {
  const { db, refresh } = useFinance();
  const cashflow = useCashflow();
  const { prefs, patch } = useFinancePreferences();
  const [viewTab, setViewTab] = useState<ViewTab>("movimientos");
  const [filter, setFilter] = useState<MovFilter>(prefs.gastosFilter ?? "all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [editingTx, setEditingTx] = useState<EnhancedTransaction | null>(null);

  const conceptCategoryById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of getBudgetConcepts(db)) {
      if (!c.isParent) map.set(c.id, c.category);
    }
    return map;
  }, [db]);

  const setFilterPersist = (next: MovFilter) => {
    setFilter(next);
    setCategoryFilter("all");
    patch({ gastosFilter: next });
  };

  const movementCategories = useMemo(() => {
    const set = new Set<string>();
    for (const tx of cashflow.allMovements) {
      if (filter === "in" && tx.type !== "income") continue;
      if (filter === "out" && tx.type !== "expense") continue;
      set.add(movementCategory(tx, conceptCategoryById));
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [cashflow.allMovements, filter, conceptCategoryById]);

  const list = useMemo(() => {
    const byType = cashflow.allMovements.filter((tx) => {
      if (filter === "in") return tx.type === "income";
      if (filter === "out") return tx.type === "expense";
      return true;
    });
    const byCategory =
      categoryFilter === "all"
        ? byType
        : byType.filter((tx) => movementCategory(tx, conceptCategoryById) === categoryFilter);
    return filterTransactions(byCategory, searchQuery);
  }, [cashflow.allMovements, filter, categoryFilter, searchQuery, conceptCategoryById]);

  const deleteTx = (tx: EnhancedTransaction) => {
    if (!window.confirm(`¿Eliminar «${tx.description}»?`)) return;
    db.deleteTransaction(tx.id);
    refresh();
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="app-page finance-scroll-pad space-y-4">
      <div className="app-page-inner-wide space-y-4">
        <PageHeader title="Gastos" subtitle="Movimientos y conceptos del mes" />

        <MonthSelector />

        <div className="flex border-b border-[var(--border-hairline)]">
          <button
            type="button"
            className={viewTab === "movimientos" ? "app-tab-active" : "app-tab"}
            onClick={() => setViewTab("movimientos")}
          >
            Movimientos
          </button>
          <button
            type="button"
            className={viewTab === "conceptos" ? "app-tab-active" : "app-tab"}
            onClick={() => setViewTab("conceptos")}
          >
            Conceptos
          </button>
        </div>

        {viewTab === "conceptos" ? (
          <BudgetConceptCrudPanel />
        ) : (
          <>
            <div className="flex border-b border-[var(--border-hairline)]">
              <button
                type="button"
                className={filter === "all" ? "app-tab-active" : "app-tab"}
                onClick={() => setFilterPersist("all")}
              >
                Todos
              </button>
              <button
                type="button"
                className={filter === "out" ? "app-tab-active" : "app-tab"}
                onClick={() => setFilterPersist("out")}
              >
                Salidas
              </button>
              <button
                type="button"
                className={filter === "in" ? "app-tab-active" : "app-tab"}
                onClick={() => setFilterPersist("in")}
              >
                Entradas
              </button>
            </div>

            {movementCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={categoryFilter === "all" ? "chip-active" : "chip"}
                  onClick={() => setCategoryFilter("all")}
                >
                  Todas las categorías
                </button>
                {movementCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={categoryFilter === cat ? "chip-active" : "chip"}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar movimiento, concepto o monto…"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-primary justify-center"
                onClick={() => setShowExpense(true)}
              >
                <Plus size={14} />
                Gasto
              </button>
              <button
                type="button"
                className="btn-soft justify-center"
                onClick={() => setShowIncome(true)}
              >
                <Plus size={14} />
                Ingreso
              </button>
            </div>

            <div className="finance-list">
              {list.length === 0 ? (
                <p className="text-caption px-3 py-4">
                  {isSearching
                    ? `Sin resultados para «${searchQuery.trim()}».`
                    : "Sin movimientos con este filtro."}
                </p>
              ) : (
                list.map((tx) => (
                  <SwipeableRow key={tx.id} onDelete={() => deleteTx(tx)} deleteLabel="Borrar">
                    <MovementRow tx={tx} onEdit={setEditingTx} variant="list" />
                  </SwipeableRow>
                ))
              )}
            </div>
          </>
        )}

        <FinanceSyncBar />
      </div>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {showIncome && <QuickIncomeModal onClose={() => setShowIncome(false)} />}
      {editingTx && <EditMovementModal tx={editingTx} onClose={() => setEditingTx(null)} />}
    </div>
  );
}
