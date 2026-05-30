"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import { useBudgetAnalytics } from "./useBudget";
import { getGroceriesAnalysis } from "./finance-linking";
import { useShopping } from "@/lib/hooks";
import { itemStatus } from "@/lib/purchase";
import { money } from "@/lib/money";
import QuickExpenseModal from "./QuickExpenseModal";

export default function DashboardView() {
  const { db, transactions, selectedPeriod } = useFinance();
  const analytics = useBudgetAnalytics();
  const { items: shopping } = useShopping();
  const [showExpense, setShowExpense] = useState(false);

  const mxn = analytics.totalsByCurrency.find((t) => t.currency === "MXN") ?? {
    budgeted: 0,
    actual: 0,
    variance: 0,
  };

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 pb-24"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}>
      <div>
        <h1 className="text-title">Inicio</h1>
        <p className="text-caption">Resumen del mes</p>
      </div>

      <MonthSelector />

      <div className="grid grid-cols-2 gap-2">
        <div className="surface-soft p-3">
          <p className="text-micro uppercase text-ink-faint">Presupuesto</p>
          <p className="text-lg font-bold tabular-nums text-brand-600">{money(mxn.budgeted)}</p>
        </div>
        <div className="surface-soft p-3">
          <p className="text-micro uppercase text-ink-faint">Gastado</p>
          <p className="text-lg font-bold tabular-nums text-ink">{money(mxn.actual)}</p>
        </div>
        <div className="surface-soft p-3 col-span-2">
          <p className="text-micro uppercase text-ink-faint">Salud</p>
          <p className="text-sm font-medium">
            {analytics.summary.healthy} ok · {analytics.summary.warning} alerta ·{" "}
            {analytics.summary.critical} crítico
          </p>
        </div>
      </div>

      <Link href="/compras/lista" className="block surface-soft p-4 hover:bg-brand-50/30 transition-colors">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
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

      <button
        type="button"
        onClick={() => setShowExpense(true)}
        className="fixed right-4 z-30 w-11 h-11 rounded-full bg-brand-500 text-white shadow-float flex items-center justify-center"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Registrar gasto rápido"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      {showExpense && <QuickExpenseModal onClose={() => setShowExpense(false)} />}
    </div>
  );
}
