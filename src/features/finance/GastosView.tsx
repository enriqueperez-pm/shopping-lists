"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SearchBar from "@/components/SearchBar";
import { useCashflow } from "./useCashflow";
import MonthSelector from "./MonthSelector";
import QuickExpenseModal from "./QuickExpenseModal";
import QuickIncomeModal from "./QuickIncomeModal";
import MovementsTable from "./components/MovementsTable";
import BulkMovementBar from "./components/BulkMovementBar";
import FinanceSyncBar from "./components/FinanceSyncBar";
import { useFinancePreferences } from "./useFinancePreferences";
import { filterTransactions } from "./budget-search";
import { movementCategoryLabel } from "./cashflow-analytics";
import { computeMovementAggregates } from "./components/movements-table-utils";
import type { EnhancedTransaction } from "./FinancialDatabase";

type MovFilter = "all" | "out" | "in";

export default function GastosView() {
  const cashflow = useCashflow();
  const { prefs, patch } = useFinancePreferences();
  const [filter, setFilter] = useState<MovFilter>(prefs.gastosFilter ?? "all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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
      set.add(movementCategoryLabel(tx) ?? tx.category);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [cashflow.allMovements, filter]);

  const list = useMemo(() => {
    const byType = cashflow.allMovements.filter((tx) => {
      if (filter === "in") return tx.type === "income";
      if (filter === "out") return tx.type === "expense";
      return true;
    });
    const byCategory =
      categoryFilter === "all"
        ? byType
        : byType.filter((tx) => (movementCategoryLabel(tx) ?? tx.category) === categoryFilter);
    return filterTransactions(byCategory, searchQuery);
  }, [cashflow.allMovements, filter, categoryFilter, searchQuery]);

  const summary = useMemo(() => computeMovementAggregates(list), [list]);

  const selectedTxs = useMemo(
    () => list.filter((tx) => selectedIds.has(tx.id)),
    [list, selectedIds],
  );

  const allSelected = list.length > 0 && list.every((tx) => selectedIds.has(tx.id));

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (tx: EnhancedTransaction) => {
    if (!selectionMode) setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tx.id)) next.delete(tx.id);
      else next.add(tx.id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectionMode(true);
    setSelectedIds(new Set(list.map((tx) => tx.id)));
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="app-page finance-scroll-pad finance-page-fill space-y-4 lg:space-y-0">
      <div className="app-page-inner-finance space-y-4 lg:space-y-3">
        <div className="shrink-0 space-y-4">
        <PageHeader title="Gastos" subtitle="Tabla de movimientos · edición inline" />

        <MonthSelector />

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-hairline)]">
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
          <button
            type="button"
            className={groupByCategory ? "chip-active ml-auto" : "chip ml-auto"}
            onClick={() => setGroupByCategory((v) => !v)}
          >
            Agrupar por categoría
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
          placeholder="Buscar movimiento, descripción o monto…"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          {selectionMode ? (
            <button type="button" className="btn-soft text-xs col-span-2" onClick={exitSelection}>
              Cancelar selección ({selectedIds.size})
            </button>
          ) : (
            <p className="col-span-2 text-caption text-ink-faint self-center px-1">
              {summary.count} filas · click celda para editar
            </p>
          )}
        </div>
        </div>

        {list.length === 0 ? (
          <p className="text-caption px-3 py-4 surface-soft rounded-xl shrink-0">
            {isSearching
              ? `Sin resultados para «${searchQuery.trim()}».`
              : "Sin movimientos con este filtro."}
          </p>
        ) : (
          <div className="finance-table-fill">
            <MovementsTable
              rows={list}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              groupByCategory={groupByCategory}
              categoryFilterActive={categoryFilter !== "all"}
            />
          </div>
        )}

        <div className="shrink-0 space-y-4">
          {selectionMode && selectedIds.size > 0 ? (
            <BulkMovementBar
              selectedIds={[...selectedIds]}
              selectedTxs={selectedTxs}
              onClear={exitSelection}
              onDone={exitSelection}
            />
          ) : null}

          <FinanceSyncBar />
        </div>
      </div>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {showIncome && <QuickIncomeModal onClose={() => setShowIncome(false)} />}
    </div>
  );
}
