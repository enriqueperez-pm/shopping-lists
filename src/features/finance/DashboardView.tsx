"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, ShoppingCart, X } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import { useBudgetAnalytics } from "./useBudget";
import { useCashflow } from "./useCashflow";
import { getGroceriesAnalysis } from "./finance-linking";
import { useShopping } from "@/lib/hooks";
import { itemStatus } from "@/lib/purchase";
import { money } from "@/lib/money";
import QuickExpenseModal from "./QuickExpenseModal";
import QuickIncomeModal from "./QuickIncomeModal";
import EditMovementModal from "./EditMovementModal";
import AdjustBalanceModal from "./AdjustBalanceModal";
import ConceptFormSheet from "./ConceptFormSheet";
import FlowCompareChart from "./components/FlowCompareChart";
import CategorySpendChart from "./components/CategorySpendChart";
import PageHeader from "@/components/ui/PageHeader";
import FinanceSummaryStrip from "./components/FinanceSummaryStrip";
import FinanceListSection from "./components/FinanceListSection";
import FinanceListRow from "./components/FinanceListRow";
import BudgetConceptTable, { type BudgetTableTab } from "./components/BudgetConceptTable";
import ConceptDetailSheet from "./components/ConceptDetailSheet";
import RecentMovements from "./components/RecentMovements";
import type { BudgetConceptAnalysis } from "./budget-analytics";
import type { BudgetConcept } from "./types";
import type { EnhancedTransaction } from "./FinancialDatabase";

function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

type QuickAction =
  | { kind: "income"; conceptId?: string }
  | { kind: "expense"; conceptId?: string }
  | null;

type DetailState = { row: BudgetConceptAnalysis; pending: number } | null;

export default function DashboardView() {
  const router = useRouter();
  const { db, transactions, selectedPeriod } = useFinance();
  const cashflow = useCashflow();
  const analytics = useBudgetAnalytics();
  const { items: shopping } = useShopping();
  const tableRef = useRef<HTMLDivElement>(null);

  const [budgetTab, setBudgetTab] = useState<BudgetTableTab>("pending");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [editingConcept, setEditingConcept] = useState<BudgetConcept | null>(null);
  const [editingTx, setEditingTx] = useState<EnhancedTransaction | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  const alerts = useMemo(
    () =>
      analytics.leafAnalyses
        .filter((a) => a.status === "critical" || a.status === "warning")
        .slice(0, 5),
    [analytics.leafAnalyses],
  );

  const groceries = getGroceriesAnalysis(db, selectedPeriod, transactions);
  const groceriesRemaining = groceries
    ? Math.max(0, groceries.budgeted - groceries.actual)
    : null;
  const listCart = shopping.filter((s) => itemStatus(s) === "in_cart").length;
  const listNeeded = shopping.filter((s) => itemStatus(s) === "needed").length;
  const monthLabel = periodLabel(selectedPeriod);

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openQuick = (kind: "income" | "expense", conceptId?: string) => {
    setQuickAction({ kind, conceptId });
  };

  const headerActions = (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
      <MonthSelector variant="inline" />
      <button
        type="button"
        onClick={() => setShowExpense(true)}
        className="hidden lg:inline-flex btn-primary items-center gap-1.5 px-3 py-2 text-xs"
      >
        <Plus size={16} strokeWidth={2.5} />
        Registrar gasto
      </button>
    </div>
  );

  return (
    <div className="app-page finance-scroll-pad finance-scroll-pad-fab">
      <div className="app-page-inner-wide space-y-4 pb-24 lg:pb-4">
        <PageHeader title="Inicio" subtitle={monthLabel} band={false} actions={headerActions} />

        <FinanceSummaryStrip
          disponible={cashflow.disponible}
          income={cashflow.income}
          spent={cashflow.spent}
          committed={cashflow.committed}
          onDisponibleClick={() => setShowAdjust(true)}
        />

        <div className="space-y-1.5 px-0.5">
          <div className="flex justify-between text-micro text-ink-faint">
            <span>{cashflow.totalCommittedPct}% del ingreso comprometido</span>
            <span className="tabular-nums">
              {money(cashflow.spent + cashflow.committed)} / {money(cashflow.income)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[rgb(var(--ink-rgb)/0.06)] overflow-hidden flex">
            {cashflow.spentPct > 0 ? (
              <div className="h-full bg-pantry shrink-0" style={{ width: `${cashflow.spentPct}%` }} />
            ) : null}
            {cashflow.committedPct > 0 ? (
              <div
                className="h-full bg-flujo-gold/85 shrink-0"
                style={{ width: `${cashflow.committedPct}%` }}
              />
            ) : null}
          </div>
        </div>

        {loadMessage ? <p className="text-caption text-pantry font-medium">{loadMessage}</p> : null}

        {categoryFilter ? (
          <div className="flex items-center gap-2">
            <span className="finance-filter-chip">
              {categoryFilter}
              <button
                type="button"
                className="p-0.5 rounded hover:bg-ink/10"
                onClick={() => setCategoryFilter(null)}
                aria-label="Quitar filtro"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        ) : null}

        <div className="flex border-b border-[var(--border-hairline)]">
          <button
            type="button"
            className={budgetTab === "pending" ? "app-tab-active" : "app-tab"}
            onClick={() => setBudgetTab("pending")}
          >
            Por pagar
          </button>
          <button
            type="button"
            className={budgetTab === "income" ? "app-tab-active" : "app-tab"}
            onClick={() => setBudgetTab("income")}
          >
            Ingresos
          </button>
          <button
            type="button"
            className={budgetTab === "all" ? "app-tab-active" : "app-tab"}
            onClick={() => setBudgetTab("all")}
          >
            Todos
          </button>
        </div>

        <BudgetConceptTable
          tab={budgetTab}
          categoryFilter={categoryFilter}
          tableRef={tableRef}
          onLoadMessage={(msg) => {
            setLoadMessage(msg);
            if (msg) window.setTimeout(() => setLoadMessage(null), 3500);
          }}
          onRowOpen={(row, pending) => setDetail({ row, pending })}
          onRegister={openQuick}
        />

        <FinanceListSection
          title="Accesos rápidos"
          action={
            <Link href="/presupuesto" className="btn-link">
              Presupuesto →
            </Link>
          }
        >
          <div className="finance-list">
            <FinanceListRow
              title="Compras"
              subtitle={`${listNeeded} pendiente · ${listCart} en carrito${
                groceriesRemaining !== null
                  ? ` · Supermercado ${money(groceriesRemaining)} restante`
                  : ""
              }`}
              onClick={() => router.push("/compras/lista")}
              amount={<ShoppingCart size={18} className="text-ink-muted" />}
            />
          </div>
        </FinanceListSection>

        <FinanceListSection
          title="Últimos movimientos"
          action={
            <button type="button" className="btn-link" onClick={() => router.push("/gastos")}>
              Ver todos →
            </button>
          }
        >
          {cashflow.recentMovements.length === 0 ? (
            <p className="text-caption px-0.5">Sin movimientos recientes.</p>
          ) : (
            <div className="finance-list">
              <RecentMovements
                movements={cashflow.recentMovements}
                onEditMovement={setEditingTx}
                embedded
              />
            </div>
          )}
        </FinanceListSection>

        {alerts.length > 0 ? (
          <FinanceListSection title="Alertas">
            <div className="finance-list">
              {alerts.map((a) => (
                <FinanceListRow
                  key={a.concept.id}
                  title={a.concept.name}
                  subtitle={`${money(a.actual)} / ${money(a.budgeted)}`}
                  showChevron={false}
                  amount={
                    <span
                      className={`text-sm font-bold ${
                        a.status === "critical" ? "text-danger" : "text-cart"
                      }`}
                    >
                      {Math.round(a.usagePct)}%
                    </span>
                  }
                />
              ))}
            </div>
          </FinanceListSection>
        ) : null}

        <section className="space-y-2">
          <button
            type="button"
            className="flex items-center justify-between w-full px-0.5 py-1 text-sm font-semibold text-ink"
            onClick={() => setAnalysisOpen((v) => !v)}
            aria-expanded={analysisOpen}
          >
            Análisis del mes
            <ChevronDown
              size={18}
              className={`text-ink-faint transition-transform ${analysisOpen ? "rotate-180" : ""}`}
            />
          </button>
          {analysisOpen ? (
            <div className="space-y-4 surface-soft p-4 rounded-xl">
              <div>
                <h3 className="text-xs font-semibold text-ink mb-2">Ingresos vs gastos</h3>
                <FlowCompareChart
                  income={cashflow.income}
                  spent={cashflow.spent}
                  periodLabel={monthLabel}
                  onIncomeClick={() => {
                    setBudgetTab("income");
                    setCategoryFilter(null);
                    scrollToTable();
                  }}
                  onExpenseClick={() => {
                    setBudgetTab("pending");
                    setCategoryFilter(null);
                    scrollToTable();
                  }}
                />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-ink mb-2">Gastos por categoría</h3>
                <CategorySpendChart
                  entries={cashflow.categoryBreakdown}
                  periodLabel={monthLabel}
                  onCategorySelect={(cat) => {
                    setCategoryFilter(cat);
                    setBudgetTab("all");
                    scrollToTable();
                  }}
                  selectedCategory={categoryFilter}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="finance-sticky-cta">
        <button
          type="button"
          className="btn-primary w-full justify-center gap-2 py-3 shadow-float"
          onClick={() => setShowExpense(true)}
        >
          <Plus size={18} strokeWidth={2.5} />
          Registrar gasto
        </button>
      </div>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {quickAction?.kind === "income" ? (
        <QuickIncomeModal
          initialConceptId={quickAction.conceptId}
          onClose={() => setQuickAction(null)}
        />
      ) : null}
      {quickAction?.kind === "expense" ? (
        <QuickExpenseModal
          initialConceptId={quickAction.conceptId}
          onClose={() => setQuickAction(null)}
        />
      ) : null}
      {editingTx && <EditMovementModal tx={editingTx} onClose={() => setEditingTx(null)} />}
      {showAdjust && (
        <AdjustBalanceModal
          calculated={cashflow.calculated}
          manualOverride={cashflow.manualOverride}
          onClose={() => setShowAdjust(false)}
        />
      )}
      {detail ? (
        <ConceptDetailSheet
          row={detail.row}
          pending={detail.pending}
          onClose={() => setDetail(null)}
          onRegister={() => {
            const kind = detail.row.concept.type === "income" ? "income" : "expense";
            setDetail(null);
            openQuick(kind, detail.row.concept.id);
          }}
          onEdit={() => {
            setEditingConcept(detail.row.concept);
            setDetail(null);
          }}
        />
      ) : null}
      {editingConcept ? (
        <ConceptFormSheet
          concept={editingConcept}
          type={editingConcept.type}
          onClose={() => setEditingConcept(null)}
        />
      ) : null}
    </div>
  );
}
