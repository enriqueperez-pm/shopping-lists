"use client";

import { money } from "@/lib/money";

type Props = {
  income: number;
  spent: number;
  committed: number;
};

export default function CashflowBreakdown({ income, spent, committed }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="surface-soft p-3 breakdown-income">
        <p className="text-micro uppercase opacity-80">Ingresos</p>
        <p className="text-base font-bold tabular-nums mt-0.5">{money(income)}</p>
      </div>
      <div className="surface-soft p-3 breakdown-expense">
        <p className="text-micro uppercase opacity-80">Gastado</p>
        <p className="text-base font-bold tabular-nums mt-0.5">{money(spent)}</p>
      </div>
      <div className="surface-soft p-3">
        <p className="text-micro uppercase text-ink-faint">Por pagar</p>
        <p className="text-base font-bold tabular-nums text-ink mt-0.5">{money(committed)}</p>
      </div>
    </div>
  );
}
