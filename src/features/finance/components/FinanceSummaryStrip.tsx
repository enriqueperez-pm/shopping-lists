"use client";

import { money } from "@/lib/money";

type Props = {
  disponible: number;
  income: number;
  spent: number;
  committed: number;
  onDisponibleClick?: () => void;
};

export default function FinanceSummaryStrip({
  disponible,
  income,
  spent,
  committed,
  onDisponibleClick,
}: Props) {
  return (
    <div className="finance-summary-strip">
      <button
        type="button"
        className="finance-summary-cell finance-summary-cell-primary text-left col-span-2 sm:col-span-1"
        onClick={onDisponibleClick}
        disabled={!onDisponibleClick}
      >
        <p className="text-micro text-ink-muted uppercase">Disponible</p>
        <p className="text-lg font-extrabold tabular-nums text-ink leading-tight mt-0.5">
          {money(disponible)}
        </p>
      </button>
      <div className="finance-summary-cell">
        <p className="text-micro text-ink-faint uppercase">Ingresos</p>
        <p className="text-sm font-bold tabular-nums text-pantry mt-0.5">{money(income)}</p>
      </div>
      <div className="finance-summary-cell">
        <p className="text-micro text-ink-faint uppercase">Gastado</p>
        <p className="text-sm font-bold tabular-nums text-ink mt-0.5">{money(spent)}</p>
      </div>
      <div className="finance-summary-cell">
        <p className="text-micro text-ink-faint uppercase">Por pagar</p>
        <p className="text-sm font-bold tabular-nums text-cart mt-0.5">{money(committed)}</p>
      </div>
    </div>
  );
}
