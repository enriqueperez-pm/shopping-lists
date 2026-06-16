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
  getBudgetConcepts,
  moveCategoryInOrder,
  sortGroupsByCategoryOrder,
} from "./finance-linking";
import { useBudgetAnalytics } from "./useBudget";
import { readBudgetUiState, writeBudgetUiState, isActiveBudgetConcept } from "./budget-ui-state";
import { listPendingPayments } from "./period-math";
import { money } from "@/lib/money";
import type { BudgetConcept } from "./types";
import type { BudgetConceptAnalysis } from "./budget-analytics";

type BudgetTab = "gastos" | "ingresos";

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
}

function usageTone(isIncome: boolean, pct: number) {
  if (isIncome) {
    return pct >= 100 ? "bg-pantry" : pct >= 80 ? "bg-cart" : "bg-danger";
  }
  return pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-cart" : "bg-pantry";
}

function BudgetConceptCard({
  row,
  onEdit,
  muted,
  periodLabel,
}: {
  row: BudgetConceptAnalysis;
  onEdit: (concept: BudgetConcept) => void;
  muted?: boolean;
  periodLabel?: string;
}) {
  const isIncome = row.concept.type === "income";
  const hasBudget = row.budgeted > 0;
  const pct = hasBudget ? Math.min(999, Math.round((row.actual / row.budgeted) * 100)) : 0;
  const pctDisplay = hasBudget ? `${pct}%` : "—";
  const pctBar = hasBudget ? Math.min(100, pct) : 0;

  return (
    <button
      type="button"
      onClick={() => onEdit(row.concept)}
      className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
        muted
          ? "border-[var(--border-hairline)] bg-[rgba(21,49,49,0.02)]"
          : "border-[var(--border-soft)] bg-white shadow-card hover:border-[rgba(21,49,49,0.14)]"
      }`}
    >
      <p className="text-sm font-semibold text-ink truncate">
        {row.concept.name}
        {periodLabel ? (
          <span className="text-ink-faint font-medium"> · {periodLabel}</span>
        ) : null}
      </p>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-base font-bold tabular-nums text-ink">
          {money(row.actual)}
          <span className="text-ink-faint font-medium mx-1">/</span>
          <span className="text-ink-muted font-semibold">{money(row.budgeted)}</span>
        </p>
        <span
          className={`text-sm font-bold tabular-nums shrink-0 ${
            !hasBudget
              ? "text-ink-faint"
              : pct >= 100
                ? isIncome
                  ? "text-pantry"
                  : "text-danger"
                : "text-ink-muted"
          }`}
        >
          {pctDisplay}
        </span>
      </div>

      <p className="text-micro text-ink-faint mt-0.5">
        {isIncome ? "recibido / meta" : "ejercido / presupuesto"}
        {hasBudget ? ` · ${pctDisplay} del plan` : " · sin presupuesto"}
      </p>

      {hasBudget ? (
        <div className="mt-2.5 h-1.5 rounded-full bg-[rgba(21,49,49,0.06)] overflow-hidden">
          <div
            className={`h-full rounded-full ${usageTone(isIncome, Math.min(pct, 100))}`}
            style={{ width: `${Math.max(pctBar, row.actual > 0 ? 4 : 0)}%` }}
          />
        </div>
      ) : null}
    </button>
  );
}

export default function PresupuestoView() {
  const { db, transactions, selectedPeriod, refresh } = useFinance();
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

  const priorPendingRows = useMemo(() => {
    if (tab !== "gastos") return [];
    const concepts = getBudgetConcepts(db);
    return listPendingPayments(concepts, transactions, selectedPeriod)
      .filter((item) => item.originPeriod !== selectedPeriod)
      .map((item) => {
        const concept = concepts.find((c) => c.id === item.conceptId);
        if (!concept) return null;
        return {
          originPeriod: item.originPeriod,
          row: {
            concept,
            actual: item.paid,
            budgeted: item.budgeted,
            variance: item.paid - item.budgeted,
            variancePct:
              item.budgeted > 0 ? ((item.paid - item.budgeted) / item.budgeted) * 100 : 0,
            usagePct: item.budgeted > 0 ? (item.paid / item.budgeted) * 100 : 0,
            txCount: 0,
            status: "warning" as const,
            isPositiveVariance: false,
          },
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [db, transactions, selectedPeriod, tab]);

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
      className="app-scroll-y px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
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

      <div className="space-y-5 pb-2">
        {priorPendingRows.length > 0 ? (
          <section className="space-y-2">
            <div className="px-0.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                Adeudos de meses anteriores
              </h3>
              <p className="text-caption text-ink-faint">
                Siguen pendientes aunque veas {formatPeriodLabel(selectedPeriod)}
              </p>
            </div>
            {priorPendingRows.map(({ row, originPeriod }) => (
              <BudgetConceptCard
                key={row.concept.id}
                row={row}
                onEdit={setEditing}
                periodLabel={formatPeriodLabel(originPeriod)}
              />
            ))}
          </section>
        ) : null}

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

            return (
              <section key={parent.concept.id} className="space-y-2">
                <div className="flex items-center gap-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(key)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left py-1"
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-ink-faint transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted truncate">
                        {parent.concept.category}
                      </h3>
                      <p className="text-caption text-ink-faint tabular-nums">
                        {money(groupActual)} / {money(groupBudgeted)} · {children.length}{" "}
                        {children.length === 1 ? "concepto" : "conceptos"}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30"
                      aria-label="Subir categoría"
                      disabled={index === 0}
                      onClick={() => moveCategory(parent.concept.id, "up")}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30"
                      aria-label="Bajar categoría"
                      disabled={index === categoryGroups.length - 1}
                      onClick={() => moveCategory(parent.concept.id, "down")}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                {!isCollapsed ? (
                  <div className="space-y-2">
                    {children.map((child) => (
                      <BudgetConceptCard
                        key={child.concept.id}
                        row={child}
                        onEdit={setEditing}
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
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted px-0.5">
              Sin categoría
            </h3>
            {activeOrphanLeaves.map((row) => (
              <BudgetConceptCard key={row.concept.id} row={row} onEdit={setEditing} />
            ))}
          </section>
        ) : null}

        {inactiveConcepts.length > 0 ? (
          <section className="pt-1">
            <button
              type="button"
              onClick={() => setShowEmptyConcepts((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-1 py-2 text-left"
              aria-expanded={showEmptyConcepts}
            >
              <div>
                <span className="text-sm font-medium text-ink-muted">Sin presupuesto ni gasto</span>
                <span className="text-caption text-ink-faint block">
                  {inactiveConcepts.length} ocultos · toca para {showEmptyConcepts ? "cerrar" : "ver"}
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
              <div className="space-y-2 mt-2">
                {inactiveConcepts.map((row) => (
                  <BudgetConceptCard
                    key={row.concept.id}
                    row={row}
                    onEdit={setEditing}
                    muted
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div aria-hidden className="h-4 shrink-0" />

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
