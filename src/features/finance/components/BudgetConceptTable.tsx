"use client";

import { useMemo, type Ref } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useFinance } from "../FinancialDbProvider";
import { useBudgetAnalytics } from "../useBudget";
import {
  copyBudgetConceptsFromPeriod,
  ensureBaselineIncomeConcepts,
} from "../finance-linking";
import { isActiveBudgetConcept } from "../budget-ui-state";
import { dedupeLeafAnalysesForPeriod } from "../budget-concept-keys";
import { listPendingPayments } from "../period-math";
import { money } from "@/lib/money";
import FinanceListRow from "./FinanceListRow";
import type { BudgetConceptAnalysis } from "../budget-analytics";

export type BudgetTableTab = "pending" | "income" | "all";

function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

type Props = {
  tab: BudgetTableTab;
  categoryFilter?: string | null;
  onRowOpen: (row: BudgetConceptAnalysis, pending: number) => void;
  onRegister: (kind: "income" | "expense", conceptId: string) => void;
  onLoadMessage?: (msg: string | null) => void;
  tableRef?: Ref<HTMLDivElement>;
};

export default function BudgetConceptTable({
  tab,
  categoryFilter,
  onRowOpen,
  onRegister,
  onLoadMessage,
  tableRef,
}: Props) {
  const { db, transactions, selectedPeriod, refresh } = useFinance();
  const analytics = useBudgetAnalytics();

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

  const allRows = useMemo(() => {
    const income = dedupeLeafAnalysesForPeriod(analytics.leafAnalyses, selectedPeriod)
      .filter((row) => row.concept.type === "income")
      .filter(isActiveBudgetConcept);

    const expense = dedupeLeafAnalysesForPeriod(analytics.leafAnalyses, selectedPeriod)
      .filter((row) => row.concept.type === "expense")
      .filter(isActiveBudgetConcept)
      .sort((a, b) => {
        const pendingA = pendingByConceptId.get(a.concept.id) ?? 0;
        const pendingB = pendingByConceptId.get(b.concept.id) ?? 0;
        if (pendingA !== pendingB) return pendingB - pendingA;
        return b.budgeted - a.budgeted || a.concept.name.localeCompare(b.concept.name, "es");
      });

    return { income, expense };
  }, [analytics.leafAnalyses, selectedPeriod, pendingByConceptId]);

  const filteredRows = useMemo(() => {
    let rows: BudgetConceptAnalysis[] = [];
    if (tab === "income") {
      rows = allRows.income;
    } else if (tab === "pending") {
      rows = allRows.expense.filter((row) => (pendingByConceptId.get(row.concept.id) ?? 0) > 0);
    } else {
      rows = [...allRows.income, ...allRows.expense];
    }

    if (categoryFilter) {
      rows = rows.filter((row) => row.concept.category === categoryFilter);
    }

    return rows.sort((a, b) => {
      const cat = a.concept.category.localeCompare(b.concept.category, "es");
      if (cat !== 0) return cat;
      return a.concept.name.localeCompare(b.concept.name, "es");
    });
  }, [allRows, tab, categoryFilter, pendingByConceptId]);

  const grouped = useMemo(() => {
    const map = new Map<string, BudgetConceptAnalysis[]>();
    for (const row of filteredRows) {
      const list = map.get(row.concept.category) ?? [];
      list.push(row);
      map.set(row.concept.category, list);
    }
    return [...map.entries()];
  }, [filteredRows]);

  const hasAnyConcept = allRows.income.length > 0 || allRows.expense.length > 0;

  const loadFromPresupuesto = () => {
    const prev = previousPeriod(selectedPeriod);
    copyBudgetConceptsFromPeriod(db, prev, selectedPeriod);
    ensureBaselineIncomeConcepts(db, selectedPeriod);
    refresh();
    onLoadMessage?.(`Conceptos cargados desde ${prev}.`);
  };

  if (!hasAnyConcept) {
    return (
      <div className="finance-list p-4 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          Sin conceptos este mes. Carga el presupuesto anterior o créalos en{" "}
          <Link href="/presupuesto" className="font-semibold text-ink hover:underline">
            Presupuesto
          </Link>
          .
        </p>
        <button type="button" className="btn-primary mx-auto gap-1.5" onClick={loadFromPresupuesto}>
          <Download size={16} />
          Cargar presupuesto
        </button>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="finance-list p-4 text-center">
        <p className="text-caption text-ink-muted">
          {tab === "pending"
            ? "Nada pendiente de pago este mes."
            : "Sin conceptos con este filtro."}
        </p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="finance-list">
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 border-b border-[var(--border-hairline)] text-micro text-ink-faint uppercase">
        <span>Concepto</span>
        <span className="text-right w-24">Ejecutado</span>
        <span className="text-right w-20 hidden md:block">Presup.</span>
        <span className="w-20" />
      </div>
      {grouped.map(([category, rows]) => (
        <div key={category}>
          <p className="finance-list-group-label">{category}</p>
          {rows.map((row) => {
            const pending = pendingByConceptId.get(row.concept.id) ?? 0;
            const isIncome = row.concept.type === "income";
            const highlight = categoryFilter === category;
            const subtitle = row.concept.subcategory
              ? `${row.concept.subcategory}${pending > 0 ? ` · Por pagar ${money(pending)}` : ""}`
              : pending > 0
                ? `Por pagar ${money(pending)}`
                : undefined;

            return (
              <div
                key={row.concept.id}
                className={`flex items-stretch border-b border-[var(--border-hairline)] last:border-b-0 ${
                  highlight ? "finance-list-row-highlight" : ""
                }`}
              >
                <FinanceListRow
                  title={row.concept.name}
                  subtitle={subtitle}
                  highlight={false}
                  showChevron
                  onClick={() => onRowOpen(row, pending)}
                  amount={
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{money(row.actual)}</p>
                      <p className="text-micro text-ink-faint hidden sm:block">
                        / {money(row.budgeted)}
                      </p>
                      <p className="text-micro text-ink-faint sm:hidden">
                        pres. {money(row.budgeted)}
                      </p>
                    </div>
                  }
                  className="flex-1 border-b-0 min-w-0"
                />
                <div className="flex items-center shrink-0 pr-2 border-l border-[var(--border-hairline)]">
                  <button
                    type="button"
                    className="text-xs font-semibold text-ink px-2 py-1.5 rounded-lg hover:bg-[rgb(var(--ink-rgb)/0.04)] whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegister(isIncome ? "income" : "expense", row.concept.id);
                    }}
                  >
                    {isIncome ? "Registrar" : "Pagar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
