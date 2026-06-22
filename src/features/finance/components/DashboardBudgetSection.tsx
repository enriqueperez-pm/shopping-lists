"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { useFinance } from "../FinancialDbProvider";
import { useBudgetAnalytics } from "../useBudget";
import { useCashflow } from "../useCashflow";
import {
  copyBudgetConceptsFromPeriod,
  ensureBaselineIncomeConcepts,
} from "../finance-linking";
import { isActiveBudgetConcept } from "../budget-ui-state";
import { listPendingPayments } from "../period-math";
import { money } from "@/lib/money";
import BudgetConceptMiniCard from "./BudgetConceptMiniCard";
import ConceptFormSheet from "../ConceptFormSheet";
import QuickIncomeModal from "../QuickIncomeModal";
import QuickExpenseModal from "../QuickExpenseModal";
import type { BudgetConcept } from "../types";

function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

type QuickAction =
  | { kind: "income"; conceptId?: string }
  | { kind: "expense"; conceptId?: string }
  | null;

export default function DashboardBudgetSection() {
  const { db, transactions, selectedPeriod, refresh } = useFinance();
  const analytics = useBudgetAnalytics();
  const cashflow = useCashflow();
  const [creatingType, setCreatingType] = useState<"income" | "expense" | null>(null);
  const [editingConcept, setEditingConcept] = useState<BudgetConcept | null>(null);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  const pendingByConceptId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of listPendingPayments(
      analytics.periodConcepts,
      transactions,
      selectedPeriod,
    )) {
      map.set(item.conceptId, item.pending);
    }
    return map;
  }, [analytics.periodConcepts, transactions, selectedPeriod]);

  const incomeRows = useMemo(
    () =>
      analytics.leafAnalyses
        .filter((row) => row.concept.type === "income")
        .filter(isActiveBudgetConcept)
        .sort((a, b) => b.budgeted - a.budgeted || a.concept.name.localeCompare(b.concept.name, "es")),
    [analytics.leafAnalyses],
  );

  const expenseRows = useMemo(() => {
    const rows = analytics.leafAnalyses
      .filter((row) => row.concept.type === "expense")
      .filter(isActiveBudgetConcept);

    return rows.sort((a, b) => {
      const pendingA = pendingByConceptId.get(a.concept.id) ?? 0;
      const pendingB = pendingByConceptId.get(b.concept.id) ?? 0;
      if (pendingA !== pendingB) return pendingB - pendingA;
      if (a.concept.isFixed !== b.concept.isFixed) return a.concept.isFixed ? -1 : 1;
      return b.budgeted - a.budgeted || a.concept.name.localeCompare(b.concept.name, "es");
    });
  }, [analytics.leafAnalyses, pendingByConceptId]);

  const incomeBudgeted = incomeRows.reduce((sum, row) => sum + row.budgeted, 0);
  const incomeActual = incomeRows.reduce((sum, row) => sum + row.actual, 0);
  const expenseCommitted = cashflow.committed;
  const hasAnyConcept = incomeRows.length > 0 || expenseRows.length > 0;

  const loadFromPresupuesto = () => {
    const prev = previousPeriod(selectedPeriod);
    copyBudgetConceptsFromPeriod(db, prev, selectedPeriod);
    ensureBaselineIncomeConcepts(db, selectedPeriod);
    refresh();
    setLoadMessage(`Conceptos cargados desde ${prev}.`);
    window.setTimeout(() => setLoadMessage(null), 3500);
  };

  const openQuick = (kind: "income" | "expense", conceptId?: string) => {
    setQuickAction({ kind, conceptId });
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="dashboard-section-label">Ingresos comprometidos</h2>
            <p className="text-caption mt-1">
              Conceptos del presupuesto que definen tu mes ·{" "}
              <Link href="/presupuesto" className="text-ink-muted font-semibold hover:text-ink">
                Ver presupuesto →
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              className="btn-soft gap-1.5 text-xs py-2"
              onClick={loadFromPresupuesto}
            >
              <Download size={14} />
              Cargar del mes anterior
            </button>
            <button
              type="button"
              className="btn-soft gap-1.5 text-xs py-2"
              onClick={() => setCreatingType("income")}
            >
              <Plus size={14} />
              Ingreso
            </button>
            <button
              type="button"
              className="btn-soft gap-1.5 text-xs py-2"
              onClick={() => setCreatingType("expense")}
            >
              <Plus size={14} />
              Gasto
            </button>
          </div>
        </div>

        {loadMessage ? <p className="text-caption text-pantry font-medium">{loadMessage}</p> : null}

        {!hasAnyConcept ? (
          <div className="surface-soft p-4 space-y-3 text-center">
            <p className="text-sm text-ink-muted">
              Aún no hay conceptos para este mes. Carga el presupuesto del mes anterior o crea
              conceptos de ingreso y gasto.
            </p>
            <button type="button" className="btn-primary mx-auto gap-1.5" onClick={loadFromPresupuesto}>
              <Download size={16} />
              Cargar presupuesto
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="surface-soft p-3 breakdown-income">
                <p className="text-micro uppercase opacity-80">Ingresos presup.</p>
                <p className="text-base font-bold tabular-nums mt-0.5">{money(incomeBudgeted)}</p>
                <p className="text-micro mt-1 opacity-80">Recibido {money(incomeActual)}</p>
              </div>
              <div className="surface-soft p-3">
                <p className="text-micro uppercase text-ink-faint">Por pagar</p>
                <p className="text-base font-bold tabular-nums text-ink mt-0.5">
                  {money(expenseCommitted)}
                </p>
                <p className="text-micro text-ink-faint mt-1">
                  {cashflow.totalCommittedPct}% del ingreso
                </p>
              </div>
              <div className="surface-soft p-3 col-span-2 sm:col-span-1 breakdown-expense">
                <p className="text-micro uppercase opacity-80">Gastado</p>
                <p className="text-base font-bold tabular-nums mt-0.5">{money(cashflow.spent)}</p>
                <p className="text-micro mt-1 opacity-80">
                  Disponible {money(cashflow.disponible)}
                </p>
              </div>
            </div>

            {incomeRows.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                  Ingresos del mes
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {incomeRows.map((row) => (
                    <BudgetConceptMiniCard
                      key={row.concept.id}
                      row={row}
                      variant="income"
                      onEdit={() => setEditingConcept(row.concept)}
                      onRegister={() => openQuick("income", row.concept.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {expenseRows.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
                  Comprometido del ingreso
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {expenseRows.slice(0, 12).map((row) => (
                    <BudgetConceptMiniCard
                      key={row.concept.id}
                      row={row}
                      variant="expense"
                      pending={pendingByConceptId.get(row.concept.id)}
                      onEdit={() => setEditingConcept(row.concept)}
                      onRegister={() => openQuick("expense", row.concept.id)}
                    />
                  ))}
                </div>
                {expenseRows.length > 12 ? (
                  <p className="text-caption">
                    +{expenseRows.length - 12} conceptos más en{" "}
                    <Link href="/presupuesto" className="font-semibold text-ink-muted hover:text-ink">
                      Presupuesto
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>

      {creatingType ? (
        <ConceptFormSheet
          type={creatingType}
          onClose={() => setCreatingType(null)}
          onSaved={() => refresh()}
        />
      ) : null}

      {editingConcept ? (
        <ConceptFormSheet
          concept={editingConcept}
          type={editingConcept.type}
          onClose={() => setEditingConcept(null)}
          onSaved={() => refresh()}
        />
      ) : null}

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
    </>
  );
}
