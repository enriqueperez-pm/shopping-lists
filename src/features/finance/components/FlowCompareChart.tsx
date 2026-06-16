"use client";

import { money } from "@/lib/money";

type Props = {
  income: number;
  spent: number;
  periodLabel: string;
};

export default function FlowCompareChart({ income, spent, periodLabel }: Props) {
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
          Ingresos (movimientos)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--expense-color)]" />
          Gastos (movimientos)
        </span>
        <span className="ml-auto font-semibold">
          Neto{" "}
          <strong style={{ color: net >= 0 ? "var(--income-color)" : "var(--expense-color)" }}>
            {money(net)}
          </strong>
        </span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-faint">Ingresos</span>
            <span className="font-semibold tabular-nums text-[var(--income-color)]">
              {money(income)}
            </span>
          </div>
          <div className="compare-bar-bg">
            <div className="compare-bar-fill income" style={{ width: `${incomePct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-faint">Gastos</span>
            <span className="font-semibold tabular-nums text-[var(--expense-color)]">
              {money(spent)}
            </span>
          </div>
          <div className="compare-bar-bg">
            <div className="compare-bar-fill expense" style={{ width: `${expensePct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
