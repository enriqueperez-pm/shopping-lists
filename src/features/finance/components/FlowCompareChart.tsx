"use client";

import { money } from "@/lib/money";

type Props = {
  income: number;
  spent: number;
  periodLabel: string;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
};

export default function FlowCompareChart({
  income,
  spent,
  periodLabel,
  onIncomeClick,
  onExpenseClick,
}: Props) {
  const max = Math.max(income, spent, 1);
  const incomePct = Math.round((income / max) * 100);
  const expensePct = Math.round((spent / max) * 100);
  const net = income - spent;

  if (income === 0 && spent === 0) {
    return <p className="text-caption">Sin movimientos en {periodLabel}.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-micro">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--income-color)]" />
          Ingresos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--expense-color)]" />
          Gastos
        </span>
        <span className="ml-auto font-semibold">
          Neto{" "}
          <strong style={{ color: net >= 0 ? "var(--income-color)" : "var(--expense-color)" }}>
            {money(net)}
          </strong>
        </span>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          className={`w-full text-left rounded-lg p-1 -m-1 transition-colors ${
            onIncomeClick ? "hover:bg-[rgb(var(--ink-rgb)/0.04)] cursor-pointer" : ""
          }`}
          onClick={onIncomeClick}
          disabled={!onIncomeClick}
        >
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-faint">Ingresos · tap para filtrar</span>
            <span className="font-semibold tabular-nums text-[var(--income-color)]">
              {money(income)}
            </span>
          </div>
          <div className="compare-bar-bg">
            <div className="compare-bar-fill income" style={{ width: `${incomePct}%` }} />
          </div>
        </button>
        <button
          type="button"
          className={`w-full text-left rounded-lg p-1 -m-1 transition-colors ${
            onExpenseClick ? "hover:bg-[rgb(var(--ink-rgb)/0.04)] cursor-pointer" : ""
          }`}
          onClick={onExpenseClick}
          disabled={!onExpenseClick}
        >
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-faint">Gastos · tap para filtrar</span>
            <span className="font-semibold tabular-nums text-[var(--expense-color)]">
              {money(spent)}
            </span>
          </div>
          <div className="compare-bar-bg">
            <div className="compare-bar-fill expense" style={{ width: `${expensePct}%` }} />
          </div>
        </button>
      </div>
    </div>
  );
}
