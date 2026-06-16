"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import ConceptEditor from "./ConceptEditor";
import ConceptCreatorModal from "./ConceptCreatorModal";
import QuickIncomeModal from "./QuickIncomeModal";
import PageHeader from "@/components/ui/PageHeader";
import {
  copyBudgetConceptsFromPeriod,
  getBudgetCategoryOrder,
  moveCategoryInOrder,
  sortGroupsByCategoryOrder,
} from "./finance-linking";
import { useBudgetAnalytics } from "./useBudget";
import { readBudgetUiState, writeBudgetUiState, isActiveBudgetConcept } from "./budget-ui-state";
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
  const [showEmptyConcepts, setShowEmptyConcepts] = useState(
    () => readBudgetUiState()?.showEmptyConcepts ?? false,
  );

  useEffect(() => {
    writeBudgetUiState({ collapsed, showEmptyConcepts });
  }, [collapsed, showEmptyConcepts]);

  const conceptType = tab === "gastos" ? "expense" : "income";

  const { categoryGroups, activeOrphanLeaves, inactiveConcepts } = useMemo(() => {
    const parents = analytics.parentAnalyses.filter((row) => row.concept.type === conceptType);
    const leaves = analytics.leafAnalyses.filter((row) => row.concept.type === conceptType);

    const inactive: BudgetConceptAnalysis[] = [];

    const groups = parents
      .map((parent) => {
        const allChildren = leaves
          .filter((leaf) => leaf.concept.parentId === parent.concept.id)
          .sort((a, b) => a.concept.name.localeCompare(b.concept.name, "es"));
        const activeChildren = allChildren.filter(isActiveBudgetConcept);
        inactive.push(...allChildren.filter((c) => !isActiveBudgetConcept(c)));
        return { parent, children: activeChildren };
      })
      .filter((group) => group.children.length > 0);

    const order = getBudgetCategoryOrder(db, selectedPeriod, conceptType);
    const sortedGroups = sortGroupsByCategoryOrder(groups, order);

    const linked = new Set(sortedGroups.flatMap((group) => group.children.map((c) => c.concept.id)));
    const orphans = leaves
      .filter((row) => !linked.has(row.concept.id))
      .sort((a, b) => a.concept.name.localeCompare(b.concept.name, "es"));

    const activeOrphans = orphans.filter(isActiveBudgetConcept);
    inactive.push(...orphans.filter((c) => !isActiveBudgetConcept(c)));

    inactive.sort((a, b) => a.concept.name.localeCompare(b.concept.name, "es"));

    return {
      categoryGroups: sortedGroups,
      activeOrphanLeaves: activeOrphans,
      inactiveConcepts: inactive,
    };
  }, [analytics.parentAnalyses, analytics.leafAnalyses, conceptType, db, selectedPeriod]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const moveCategory = (parentId: string, direction: "up" | "down") => {
    moveCategoryInOrder(
      db,
      selectedPeriod,
      conceptType,
      parentId,
      direction,
      categoryGroups.map((group) => group.parent.concept.id),
    );
    refresh();
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
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
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
        {categoryGroups.length === 0 && activeOrphanLeaves.length === 0 ? (
          inactiveConcepts.length > 0 ? (
            <p className="text-caption">
              Ningún concepto con presupuesto o gasto este mes. Revisa los ocultos abajo o asigna
              montos.
            </p>
          ) : (
            <p className="text-caption">
              Sin conceptos de {tab === "gastos" ? "gasto" : "ingreso"} este mes.
            </p>
          )
        ) : (
          categoryGroups.map(({ parent, children }, index) => {
            const key = `budget:${tab}:${parent.concept.id}`;
            const isCollapsed = collapsed[key];
            const groupBudgeted = children.reduce((s, c) => s + c.budgeted, 0);
            const groupActual = children.reduce((s, c) => s + c.actual, 0);
            const parentPct =
              groupBudgeted > 0 ? Math.min(100, (groupActual / groupBudgeted) * 100) : 0;

            return (
              <section key={parent.concept.id} className="surface-soft overflow-hidden">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(key)}
                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[rgba(21,49,49,0.03)] transition-colors min-w-0"
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
                          {money(groupActual)} / {money(groupBudgeted)}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-col border-l border-[var(--border-hairline)] shrink-0">
                    <button
                      type="button"
                      className="px-2 py-1 text-ink-faint hover:text-ink hover:bg-[rgba(21,49,49,0.03)] disabled:opacity-30"
                      aria-label="Subir categoría"
                      disabled={index === 0}
                      onClick={() => moveCategory(parent.concept.id, "up")}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-ink-faint hover:text-ink hover:bg-[rgba(21,49,49,0.03)] disabled:opacity-30"
                      aria-label="Bajar categoría"
                      disabled={index === categoryGroups.length - 1}
                      onClick={() => moveCategory(parent.concept.id, "down")}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
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

        {activeOrphanLeaves.length > 0 ? (
          <section className="space-y-2">
            {categoryGroups.length > 0 ? (
              <p className="text-micro text-ink-faint px-1">Sin categoría padre</p>
            ) : null}
            {activeOrphanLeaves.map((row) => (
              <ConceptProgressRow key={row.concept.id} row={row} onEdit={setEditing} />
            ))}
          </section>
        ) : null}

        {inactiveConcepts.length > 0 ? (
          <section className="surface-soft overflow-hidden border border-dashed border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={() => setShowEmptyConcepts((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[rgba(21,49,49,0.03)] transition-colors"
              aria-expanded={showEmptyConcepts}
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink-muted">
                  Sin presupuesto ni gasto
                </span>
                <span className="text-micro text-ink-faint block">
                  {inactiveConcepts.length} concepto
                  {inactiveConcepts.length !== 1 ? "s" : ""} oculto
                  {inactiveConcepts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-ink-faint transition-transform ${
                  showEmptyConcepts ? "rotate-180" : ""
                }`}
              />
            </button>
            {showEmptyConcepts ? (
              <div className="border-t border-[var(--border-hairline)] opacity-80">
                {inactiveConcepts.map((row) => (
                  <ConceptProgressRow
                    key={row.concept.id}
                    row={row}
                    onEdit={setEditing}
                    compact
                  />
                ))}
              </div>
            ) : null}
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
