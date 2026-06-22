"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import { useBudgetAnalytics } from "./useBudget";
import { useCashflow } from "./useCashflow";
import { getGroceriesAnalysis } from "./finance-linking";
import { useShopping } from "@/lib/hooks";
import { itemStatus } from "@/lib/purchase";
import { money } from "@/lib/money";
import QuickExpenseModal from "./QuickExpenseModal";
import EditMovementModal from "./EditMovementModal";
import AdjustBalanceModal from "./AdjustBalanceModal";
import DisponibleHero from "./components/DisponibleHero";
import CashflowBreakdown from "./components/CashflowBreakdown";
import UsageProgressBar from "./components/UsageProgressBar";
import FlowCompareChart from "./components/FlowCompareChart";
import CategorySpendChart from "./components/CategorySpendChart";
import PageHeader from "@/components/ui/PageHeader";
import AppFab from "@/components/ui/AppFab";
import RecentMovements from "./components/RecentMovements";
import DashboardBudgetSection from "./components/DashboardBudgetSection";
import type { EnhancedTransaction } from "./FinancialDatabase";

function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function DashboardSection({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      <h2 className="dashboard-section-label">{label}</h2>
      {children}
    </section>
  );
}

export default function DashboardView() {
  const router = useRouter();
  const { db, transactions, selectedPeriod } = useFinance();
  const cashflow = useCashflow();
  const analytics = useBudgetAnalytics();
  const { items: shopping } = useShopping();
  const [showExpense, setShowExpense] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [editingTx, setEditingTx] = useState<EnhancedTransaction | null>(null);

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
      <div className="app-page-inner-wide space-y-6">
        <PageHeader
          title="Inicio"
          subtitle="Resumen de tu mes"
          actions={headerActions}
        />

        <DashboardSection label="Resumen del mes">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">
              <DisponibleHero
                disponible={cashflow.disponible}
                calculated={cashflow.calculated}
                manualOverride={cashflow.manualOverride}
                onAdjust={() => setShowAdjust(true)}
              />
              <CashflowBreakdown
                income={cashflow.income}
                spent={cashflow.spent}
                committed={cashflow.committed}
              />
            </div>
            <UsageProgressBar
              spentPct={cashflow.spentPct}
              committedPct={cashflow.committedPct}
              totalCommittedPct={cashflow.totalCommittedPct}
              spent={cashflow.spent}
              committed={cashflow.committed}
              income={cashflow.income}
              pendingPayments={cashflow.pendingPayments}
              viewingPeriod={selectedPeriod}
            />
          </div>
        </DashboardSection>

        <DashboardBudgetSection />

        <DashboardSection label="Análisis">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-soft p-4 space-y-3">
              <h3 className="dashboard-card-title">Ingresos vs gastos</h3>
              <FlowCompareChart
                income={cashflow.income}
                spent={cashflow.spent}
                periodLabel={monthLabel}
              />
            </div>
            <div className="surface-soft p-4 space-y-3">
              <h3 className="dashboard-card-title">Gastos por categoría</h3>
              <CategorySpendChart
                entries={cashflow.categoryBreakdown}
                periodLabel={monthLabel}
              />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection label="Actividad">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <RecentMovements
              movements={cashflow.recentMovements}
              onSeeAll={() => router.push("/gastos")}
              onEditMovement={setEditingTx}
            />
            <Link
              href="/compras/lista"
              className="block surface-soft p-4 hover:bg-[rgb(var(--ink-rgb) / 0.03)] transition-colors h-fit"
            >
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-[rgb(var(--ink-rgb) / 0.06)] flex items-center justify-center text-ink">
                  <ShoppingCart size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">Compras</p>
                  <p className="text-caption">
                    {listNeeded} pendiente · {listCart} en carrito
                  </p>
                  {groceriesRemaining !== null && (
                    <p className="text-micro text-pantry mt-1">
                      Supermercado: {money(groceriesRemaining)} restante de{" "}
                      {money(groceries?.budgeted ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </DashboardSection>

        {alerts.length > 0 ? (
          <DashboardSection label="Alertas">
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.concept.id}
                  className="surface-soft px-3 py-2.5 flex justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.concept.name}</p>
                    <p className="text-micro text-ink-faint">
                      {money(a.actual)} / {money(a.budgeted)}
                    </p>
                  </div>
                  <span
                    className={`text-micro font-semibold shrink-0 ${
                      a.status === "critical" ? "text-danger" : "text-cart"
                    }`}
                  >
                    {Math.round(a.usagePct)}%
                  </span>
                </div>
              ))}
            </div>
          </DashboardSection>
        ) : null}
      </div>

      <AppFab
        onClick={() => setShowExpense(true)}
        ariaLabel="Registrar gasto rápido"
        className="lg:hidden"
      >
        <Plus size={20} strokeWidth={2.5} />
      </AppFab>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
      {editingTx && <EditMovementModal tx={editingTx} onClose={() => setEditingTx(null)} />}
      {showAdjust && (
        <AdjustBalanceModal
          calculated={cashflow.calculated}
          manualOverride={cashflow.manualOverride}
          onClose={() => setShowAdjust(false)}
        />
      )}
    </div>
  );
}
