"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import ConceptEditor from "./ConceptEditor";
import ConceptCreatorModal from "./ConceptCreatorModal";
import QuickIncomeModal from "./QuickIncomeModal";
import PageHeader from "@/components/ui/PageHeader";
import { copyBudgetConceptsFromPeriod } from "./finance-linking";
import { useBudgetAnalytics } from "./useBudget";
import { readBudgetUiState, writeBudgetUiState } from "./budget-ui-state";
import { money } from "@/lib/money";
import type { BudgetConcept } from "./types";
import type { BudgetConceptAnalysis } from "./budget-analytics";

type BudgetTab = "gastos" | "ingresos";

function usageTone(isIncome: boolean, pct: number) {
  if (isIncome) {
    return pct >= 100 ? "bg-pantry" : pct >= 80 ? "bg-cart" : "bg-danger";
  }
  return pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-cart" : "bg-pantry";
}

function ConceptProgressRow({
  row,
  onEdit,
  compact,
}: {
  row: BudgetConceptAnalysis;
  onEdit: (concept: BudgetConcept) => void;
  compact?: boolean;
}) {
  const pct = row.budgeted > 0 ? Math.min(100, (row.actual / row.budgeted) * 100) : 0;
  const isIncome = row.concept.type === "income";

  return (
    <button
      type="button"
      onClick={() => onEdit(row.concept)}
      className={`w-full text-left hover:bg-[rgba(21,49,49,0.03)] transition-colors ${
        compact ? "px-3 py-2.5 border-t border-[var(--border-hairline)]" : "surface-soft p-3"
      }`}
    >
      <div className="flex justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{row.concept.name}</p>
          {row.concept.subcategory ? (
            <p className="text-micro text-ink-faint truncate">{row.concept.subcategory}</p>
          ) : null}
        </div>
        <p className="text-sm font-semibold tabular-nums shrink-0">
          {money(row.actual)} / {money(row.budgeted)}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border-hairline)] overflow-hidden">
        <div
          className={`h-full rounded-full ${usageTone(isIncome, pct)}`}
          style={{ width: `${pct || 4}%` }}
        />
      </div>
    </button>
  );
}

export default function PresupuestoView() {
  const { db, selectedPeriod, refresh } = useFinance();
  const analytics = useBudgetAnalytics();
  const [editing, setEditing] = useState<BudgetConcept | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<BudgetTab>("gastos");
  const [showIncome, setShowIncome] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    return readBudgetUiState()?.collapsed ?? {};
  });

  useEffect(() => {
    writeBudgetUiState({ collapsed });
  }, [collapsed]);

  const conceptType = tab === "gastos" ? "expense" : "income";

  const categoryGroups = useMemo(() => {
    const parents = analytics.parentAnalyses.filter((row) => row.concept.type === conceptType);
    const leaves = analytics.leafAnalyses.filter((row) => row.concept.type === conceptType);

    return parents
      .map((parent) => ({
        parent,
        children: leaves
          .filter((leaf) => leaf.concept.parentId === parent.concept.id)
          .sort((a, b) => a.concept.name.localeCompare(b.concept.name, "es")),
      }))
      .filter((group) => group.children.length > 0)
      .sort((a, b) => a.parent.concept.category.localeCompare(b.parent.concept.category, "es"));
  }, [analytics.parentAnalyses, analytics.leafAnalyses, conceptType]);

  const orphanLeaves = useMemo(() => {
    const linked = new Set(categoryGroups.flatMap((group) => group.children.map((c) => c.concept.id)));
    return analytics.leafAnalyses
      .filter((row) => row.concept.type === conceptType && !linked.has(row.concept.id))
      .sort((a, b) => a.concept.name.localeCompare(b.concept.name, "es"));
  }, [analytics.leafAnalyses, categoryGroups, conceptType]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyPreviousMonth = () => {
    const [y, m] = selectedPeriod.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    copyBudgetConceptsFromPeriod(db, prevPeriod, selectedPeriod);
    refresh();
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad-compact"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
    >
      <PageHeader
        title="Presupuesto"
        subtitle="Conceptos del mes (MXN)"
        actions={
          <button type="button" className="btn-soft shrink-0" onClick={copyPreviousMonth}>
            Copiar mes anterior
          </button>
        }
      />

      <MonthSelector />

      <div className="flex border-b border-[var(--border-hairline)]">
        <button
          type="button"
          className={tab === "gastos" ? "app-tab-active" : "app-tab"}
          onClick={() => setTab("gastos")}
        >
          Gastos
        </button>
        <button
          type="button"
          className={tab === "ingresos" ? "app-tab-active" : "app-tab"}
          onClick={() => setTab("ingresos")}
        >
          Ingresos
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-primary justify-center gap-1"
          onClick={() => setCreating(true)}
        >
          <Plus size={14} />
          Nuevo concepto
        </button>
        {tab === "ingresos" ? (
          <button
            type="button"
            className="btn-soft justify-center gap-1"
            onClick={() => setShowIncome(true)}
          >
            <Plus size={14} />
            Registrar ingreso
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="space-y-3">
        {categoryGroups.length === 0 && orphanLeaves.length === 0 ? (
          <p className="text-caption">
            Sin conceptos de {tab === "gastos" ? "gasto" : "ingreso"} este mes.
          </p>
        ) : (
          categoryGroups.map(({ parent, children }) => {
            const key = `budget:${tab}:${parent.concept.id}`;
            const isCollapsed = collapsed[key];
            const parentPct =
              parent.budgeted > 0 ? Math.min(100, (parent.actual / parent.budgeted) * 100) : 0;

            return (
              <section key={parent.concept.id} className="surface-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCollapse(key)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[rgba(21,49,49,0.03)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-ink-faint transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <div className="min-w-0 text-left">
                      <span className="category-label uppercase block truncate">
                        {parent.concept.category}
                      </span>
                      <span className="text-micro text-ink-faint tabular-nums">
                        {children.length} concepto{children.length !== 1 ? "s" : ""} ·{" "}
                        {money(parent.actual)} / {money(parent.budgeted)}
                      </span>
                    </div>
                  </div>
                </button>
                {!isCollapsed ? (
                  <div>
                    <div className="px-3 pb-2">
                      <div className="h-1.5 rounded-full bg-[var(--border-hairline)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usageTone(parent.concept.type === "income", parentPct)}`}
                          style={{ width: `${parentPct || 4}%` }}
                        />
                      </div>
                    </div>
                    {children.map((child) => (
                      <ConceptProgressRow
                        key={child.concept.id}
                        row={child}
                        onEdit={setEditing}
                        compact
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })
        )}

        {orphanLeaves.length > 0 ? (
          <section className="space-y-2">
            {categoryGroups.length > 0 ? (
              <p className="text-micro text-ink-faint px-1">Sin categoría padre</p>
            ) : null}
            {orphanLeaves.map((row) => (
              <ConceptProgressRow key={row.concept.id} row={row} onEdit={setEditing} />
            ))}
          </section>
        ) : null}
      </div>

      {editing && (
        <ConceptEditor
          concept={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {creating && (
        <ConceptCreatorModal
          type={conceptType}
          onClose={() => setCreating(false)}
          onSaved={() => refresh()}
        />
      )}

      {showIncome && <QuickIncomeModal onClose={() => setShowIncome(false)} />}
    </div>
  );
}
