"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import ConceptFormSheet from "./ConceptFormSheet";
import QuickIncomeModal from "./QuickIncomeModal";
import PageHeader from "@/components/ui/PageHeader";
import SearchBar from "@/components/SearchBar";
import BudgetConceptRow from "./components/BudgetConceptRow";
import BudgetOrganizerDnd, { sortGroupChildren } from "./components/BudgetOrganizerDnd";
import FinanceSyncBar from "./components/FinanceSyncBar";
import {
  copyBudgetConceptsFromPeriod,
  getBudgetCategoryOrder,
  getBudgetConcepts,
  moveCategoryInOrder,
  sortGroupsByCategoryOrder,
} from "./finance-linking";
import { useBudgetAnalytics } from "./useBudget";
import { isActiveBudgetConcept } from "./budget-ui-state";
import { useFinancePreferences } from "./useFinancePreferences";
import { listPendingPayments } from "./period-math";
import { dedupeLeafAnalysesForPeriod, listCategoriesFromConcepts } from "./budget-concept-keys";
import { cleanupDuplicateConcepts } from "./finance-crud";
import {
  filterBudgetCategoryGroups,
  filterConceptRows,
  sectionKeysMatchingSearch,
} from "./budget-search";
import { money } from "@/lib/money";
import type { BudgetConcept } from "./types";
import type { BudgetConceptAnalysis } from "./budget-analytics";

type BudgetTab = "gastos" | "ingresos";

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
}

export default function PresupuestoView() {
  const { db, transactions, selectedPeriod, refresh } = useFinance();
  const { prefs, patch } = useFinancePreferences();
  const analytics = useBudgetAnalytics();
  const [editing, setEditing] = useState<BudgetConcept | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<BudgetTab>(prefs.budgetTab ?? "gastos");
  const [showIncome, setShowIncome] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const collapsed = prefs.collapsedSections ?? {};
  const showEmptyConcepts = prefs.showEmptyConcepts ?? false;
  const organizeMode = prefs.organizeMode ?? false;
  const [searchQuery, setSearchQuery] = useState("");

  const setTabPersist = (next: BudgetTab) => {
    setTab(next);
    setCategoryFilter("all");
    patch({ budgetTab: next });
  };

  const toggleCollapse = (key: string) => {
    patch({ collapsedSections: { ...collapsed, [key]: !collapsed[key] } });
  };

  const conceptType = tab === "gastos" ? "expense" : "income";

  const { categoryGroups, activeOrphanLeaves, inactiveConcepts, categories } = useMemo(() => {
    const parents = analytics.parentAnalyses.filter((row) => row.concept.type === conceptType);
    const leaves = dedupeLeafAnalysesForPeriod(analytics.leafAnalyses, selectedPeriod).filter(
      (row) => row.concept.type === conceptType,
    );

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
      categories: listCategoriesFromConcepts(analytics.periodConcepts, conceptType),
    };
  }, [analytics.parentAnalyses, analytics.leafAnalyses, analytics.periodConcepts, conceptType, db, selectedPeriod]);

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

  const filteredCategoryGroups = useMemo(() => {
    const base = filterBudgetCategoryGroups(categoryGroups, searchQuery);
    if (categoryFilter === "all") return base;
    return base.filter((group) => group.parent.concept.category === categoryFilter);
  }, [categoryGroups, searchQuery, categoryFilter]);

  const filteredOrphanLeaves = useMemo(() => {
    const rows = filterConceptRows(activeOrphanLeaves, searchQuery);
    if (categoryFilter === "all") return rows;
    return rows.filter((row) => row.concept.category === categoryFilter);
  }, [activeOrphanLeaves, searchQuery, categoryFilter]);

  const filteredPendingRows = useMemo(
    () =>
      priorPendingRows.filter((p) =>
        filterConceptRows([p.row], searchQuery).length > 0,
      ),
    [priorPendingRows, searchQuery],
  );

  const expandKeys = useMemo(
    () => sectionKeysMatchingSearch(categoryGroups, searchQuery, tab),
    [categoryGroups, searchQuery, tab],
  );

  const isSearching = searchQuery.trim().length > 0;

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

  const renderCategoryHeader = (
    group: (typeof categoryGroups)[0],
    index: number,
  ) => {
    const key = `budget:${tab}:${group.parent.concept.id}`;
    const isCollapsed = collapsed[key];
    const groupBudgeted = group.children.reduce((s, c) => s + c.budgeted, 0);
    const groupActual = group.children.reduce((s, c) => s + c.actual, 0);

    return (
      <>
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
              {group.parent.concept.category}
            </h3>
            <p className="text-caption text-ink-faint tabular-nums">
              {money(groupActual)} / {money(groupBudgeted)} · {group.children.length}{" "}
              {group.children.length === 1 ? "concepto" : "conceptos"}
            </p>
          </div>
        </button>
        {!organizeMode ? (
          <div className="flex shrink-0">
            <button
              type="button"
              className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30"
              aria-label="Subir categoría"
              disabled={index === 0}
              onClick={() => moveCategory(group.parent.concept.id, "up")}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30"
              aria-label="Bajar categoría"
              disabled={index === categoryGroups.length - 1}
              onClick={() => moveCategory(group.parent.concept.id, "down")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div className="app-page finance-scroll-pad space-y-4">
      <div className="app-page-inner-finance space-y-4">
      <PageHeader
        title="Presupuesto"
        subtitle="Conceptos del mes (MXN)"
        actions={
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className={organizeMode ? "chip-active" : "chip"}
              onClick={() => patch({ organizeMode: !organizeMode })}
            >
              Organizar
            </button>
            <button type="button" className="btn-soft" onClick={copyPreviousMonth}>
              Copiar mes
            </button>
            <button
              type="button"
              className="btn-soft"
              onClick={() => {
                cleanupDuplicateConcepts(db, selectedPeriod);
                refresh();
              }}
              title="Fusionar conceptos duplicados del mes"
            >
              <Sparkles size={14} />
            </button>
          </div>
        }
      />

      <MonthSelector />

      <div className="flex border-b border-[var(--border-hairline)]">
        <button
          type="button"
          className={tab === "gastos" ? "app-tab-active" : "app-tab"}
          onClick={() => setTabPersist("gastos")}
        >
          Gastos
        </button>
        <button
          type="button"
          className={tab === "ingresos" ? "app-tab-active" : "app-tab"}
          onClick={() => setTabPersist("ingresos")}
        >
          Ingresos
        </button>
      </div>

      {categories.length > 0 ? (
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
      ) : null}

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

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar concepto o categoría…"
      />

      <div className="space-y-5 pb-2">
        {filteredPendingRows.length > 0 ? (
          <section className="space-y-2">
            <div className="px-0.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                Adeudos de meses anteriores
              </h3>
              <p className="text-caption text-ink-faint">
                Siguen pendientes aunque veas {formatPeriodLabel(selectedPeriod)}
              </p>
            </div>
            <div className="finance-list">
            {filteredPendingRows.map(({ row, originPeriod }) => (
              <BudgetConceptRow
                key={row.concept.id}
                row={row}
                transactions={transactions}
                onEdit={setEditing}
                periodLabel={formatPeriodLabel(originPeriod)}
                variant="list"
              />
            ))}
            </div>
          </section>
        ) : null}

        {filteredCategoryGroups.length === 0 &&
        filteredOrphanLeaves.length === 0 &&
        (!isSearching || filteredPendingRows.length === 0) ? (
          isSearching ? (
            <p className="text-caption">Sin resultados para «{searchQuery.trim()}».</p>
          ) : inactiveConcepts.length > 0 ? (
            <p className="text-caption">
              Ningún concepto con presupuesto o gasto este mes. Revisa los ocultos abajo o asigna
              montos.
            </p>
          ) : (
            <p className="text-caption">
              Sin conceptos de {tab === "gastos" ? "gasto" : "ingreso"} este mes.
            </p>
          )
        ) : organizeMode ? (
          <BudgetOrganizerDnd
            db={db}
            selectedPeriod={selectedPeriod}
            conceptType={conceptType}
            categoryGroups={filteredCategoryGroups}
            transactions={transactions}
            organizeMode={organizeMode}
            collapsed={collapsed}
            tab={tab}
            onEdit={setEditing}
            onRefresh={refresh}
            renderCategoryHeader={(group, index) => renderCategoryHeader(group, index)}
          />
        ) : (
          filteredCategoryGroups.map((group, index) => {
            const key = `budget:${tab}:${group.parent.concept.id}`;
            const isCollapsed = isSearching && expandKeys.has(key) ? false : collapsed[key];
            const sortedChildren = sortGroupChildren(db, group, selectedPeriod, conceptType);

            return (
              <section key={group.parent.concept.id} className="space-y-2">
                <div className="flex items-center gap-1 px-0.5">
                  {renderCategoryHeader(group, index)}
                </div>
                {!isCollapsed ? (
                  <div className="finance-list">
                    {sortedChildren.map((child) => (
                      <BudgetConceptRow
                        key={child.concept.id}
                        row={child}
                        transactions={transactions}
                        onEdit={setEditing}
                        variant="list"
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })
        )}

        {filteredOrphanLeaves.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted px-0.5">
              Sin categoría
            </h3>
            <div className="finance-list">
              {filteredOrphanLeaves.map((row) => (
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
        ) : null}

        {inactiveConcepts.length > 0 ? (
          <section className="pt-1">
            <button
              type="button"
              onClick={() => patch({ showEmptyConcepts: !showEmptyConcepts })}
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
              <div className="finance-list mt-2">
                {inactiveConcepts.map((row) => (
                  <BudgetConceptRow
                    key={row.concept.id}
                    row={row}
                    transactions={transactions}
                    onEdit={setEditing}
                    muted
                    variant="list"
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <FinanceSyncBar />
      </div>

      {editing ? (
        <ConceptFormSheet
          concept={editing}
          type={editing.type}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}

      {creating ? (
        <ConceptFormSheet
          type={conceptType}
          onClose={() => setCreating(false)}
          onSaved={() => refresh()}
        />
      ) : null}

      {showIncome ? <QuickIncomeModal onClose={() => setShowIncome(false)} /> : null}
    </div>
  );
}
