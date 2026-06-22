"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useFinance } from "../FinancialDbProvider";
import { useBudgetAnalytics } from "../useBudget";
import {
  dedupeLeafAnalysesForPeriod,
  listCategoriesFromConcepts,
} from "../budget-concept-keys";
import { cleanupDuplicateConcepts } from "../finance-crud";
import { isActiveBudgetConcept } from "../budget-ui-state";
import { filterConceptRows } from "../budget-search";
import BudgetConceptRow from "./BudgetConceptRow";
import ConceptFormSheet from "../ConceptFormSheet";
import SearchBar from "@/components/SearchBar";
import type { BudgetConcept } from "../types";
import type { BudgetConceptAnalysis } from "../budget-analytics";

type ConceptType = "expense" | "income";

type Props = {
  fixedType?: ConceptType;
  showTypeTabs?: boolean;
  compact?: boolean;
};

export default function BudgetConceptCrudPanel({
  fixedType,
  showTypeTabs = true,
  compact = false,
}: Props) {
  const { db, transactions, selectedPeriod, refresh } = useFinance();
  const analytics = useBudgetAnalytics();
  const [conceptType, setConceptType] = useState<ConceptType>(fixedType ?? "expense");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BudgetConcept | null>(null);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);

  const activeType = fixedType ?? conceptType;

  const periodLeaves = useMemo(() => {
    const deduped = dedupeLeafAnalysesForPeriod(analytics.leafAnalyses, selectedPeriod);
    return deduped
      .filter((row) => row.concept.type === activeType)
      .filter(isActiveBudgetConcept)
      .sort((a, b) => a.concept.category.localeCompare(b.concept.category, "es"));
  }, [analytics.leafAnalyses, selectedPeriod, activeType]);

  const categories = useMemo(
    () => listCategoriesFromConcepts(analytics.periodConcepts, activeType),
    [analytics.periodConcepts, activeType],
  );

  const filteredLeaves = useMemo(() => {
    let rows = periodLeaves;
    if (categoryFilter !== "all") {
      rows = rows.filter((row) => row.concept.category === categoryFilter);
    }
    return filterConceptRows(rows, searchQuery);
  }, [periodLeaves, categoryFilter, searchQuery]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, BudgetConceptAnalysis[]>();
    for (const row of filteredLeaves) {
      const list = byCategory.get(row.concept.category) ?? [];
      list.push(row);
      byCategory.set(row.concept.category, list);
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filteredLeaves]);

  const isSearching = searchQuery.trim().length > 0;

  const handleCleanup = () => {
    const removed = cleanupDuplicateConcepts(db, selectedPeriod);
    refresh();
    setCleanupMsg(
      removed > 0
        ? `Se fusionaron ${removed} concepto(s) duplicado(s).`
        : "No había duplicados en este mes.",
    );
    window.setTimeout(() => setCleanupMsg(null), 3500);
  };

  return (
    <>
      <div className="space-y-3">
        {showTypeTabs && !fixedType ? (
          <div className="flex border-b border-[var(--border-hairline)]">
            <button
              type="button"
              className={activeType === "expense" ? "app-tab-active" : "app-tab"}
              onClick={() => {
                setConceptType("expense");
                setCategoryFilter("all");
              }}
            >
              Gastos
            </button>
            <button
              type="button"
              className={activeType === "income" ? "app-tab-active" : "app-tab"}
              onClick={() => {
                setConceptType("income");
                setCategoryFilter("all");
              }}
            >
              Ingresos
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={categoryFilter === "all" ? "chip-active" : "chip"}
            onClick={() => setCategoryFilter("all")}
          >
            Todas
          </button>
          {categories.map((cat) => (
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

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar concepto, categoría o subcategoría…"
        />

        <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
          <button
            type="button"
            className="btn-primary justify-center gap-1"
            onClick={() => setCreating(true)}
          >
            <Plus size={14} />
            Nuevo concepto
          </button>
          <button type="button" className="btn-soft justify-center gap-1" onClick={handleCleanup}>
            <Sparkles size={14} />
            Limpiar duplicados
          </button>
        </div>

        {cleanupMsg ? <p className="text-caption text-pantry font-medium">{cleanupMsg}</p> : null}

        <div className="space-y-4 pb-1">
          {grouped.length === 0 ? (
            <p className="text-caption">
              {isSearching
                ? `Sin resultados para «${searchQuery.trim()}».`
                : `Sin conceptos de ${activeType === "expense" ? "gasto" : "ingreso"} en esta categoría.`}
            </p>
          ) : (
            grouped.map(([category, rows]) => (
              <section key={category} className="space-y-0">
                <h3 className="finance-list-group-label">{category}</h3>
                <div className="finance-list mb-4">
                  {rows.map((row) => (
                    <BudgetConceptRow
                      key={row.concept.id}
                      row={row}
                      transactions={transactions}
                      onEdit={setEditing}
                      variant="list"
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {creating ? (
        <ConceptFormSheet
          type={activeType}
          onClose={() => setCreating(false)}
          onSaved={() => refresh()}
        />
      ) : null}

      {editing ? (
        <ConceptFormSheet
          concept={editing}
          type={editing.type}
          onClose={() => setEditing(null)}
          onSaved={() => refresh()}
        />
      ) : null}
    </>
  );
}
