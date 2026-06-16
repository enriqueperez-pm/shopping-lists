"use client";

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
import AdjustBalanceModal from "./AdjustBalanceModal";
import DisponibleHero from "./components/DisponibleHero";
import CashflowBreakdown from "./components/CashflowBreakdown";
import UsageProgressBar from "./components/UsageProgressBar";
import FlowCompareChart from "./components/FlowCompareChart";
import CategorySpendChart from "./components/CategorySpendChart";
import PageHeader from "@/components/ui/PageHeader";
import AppFab from "@/components/ui/AppFab";
import RecentMovements from "./components/RecentMovements";

function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export default function DashboardView() {
  const router = useRouter();
  const { db, transactions, selectedPeriod } = useFinance();
  const cashflow = useCashflow();
  const analytics = useBudgetAnalytics();
  const { items: shopping } = useShopping();
  const [showExpense, setShowExpense] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

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

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
    >
      <PageHeader title="Inicio" subtitle="Tu billetera del mes" />

      <MonthSelector />

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

      <UsageProgressBar
        usagePct={cashflow.usagePct}
        spent={cashflow.spent}
        committed={cashflow.committed}
        income={cashflow.income}
      />

      <section className="surface-soft p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink">Ingresos vs gastos</h2>
        <FlowCompareChart income={cashflow.income} spent={cashflow.spent} periodLabel={monthLabel} />
      </section>

      <section className="surface-soft p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink">Gastos por categoría</h2>
        <CategorySpendChart entries={cashflow.categoryBreakdown} periodLabel={monthLabel} />
      </section>

      <RecentMovements
        movements={cashflow.recentMovements}
        onSeeAll={() => router.push("/gastos")}
      />

      <Link
        href="/compras/lista"
        className="block surface-soft p-4 hover:bg-[rgba(21,49,49,0.03)] transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-[rgba(21,49,49,0.06)] flex items-center justify-center text-ink">
            <ShoppingCart size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Compras</p>
            <p className="text-caption">
              {listNeeded} pendiente · {listCart} en carrito
            </p>
            {groceriesRemaining !== null && (
              <p className="text-micro text-pantry mt-1">
                Despensa: {money(groceriesRemaining)} restante de {money(groceries?.budgeted ?? 0)}
              </p>
            )}
          </div>
        </div>
      </Link>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Alertas</h2>
        {alerts.length === 0 ? (
          <p className="text-caption">Sin alertas este mes.</p>
        ) : (
          alerts.map((a) => (
            <div key={a.concept.id} className="surface-soft px-3 py-2.5 flex justify-between gap-3">
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
          ))
        )}
      </section>

      <AppFab onClick={() => setShowExpense(true)} ariaLabel="Registrar gasto rápido">
        <Plus size={20} strokeWidth={2.5} />
      </AppFab>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
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
