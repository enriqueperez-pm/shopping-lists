"use client";

import type { EnhancedTransaction } from "../FinancialDatabase";
import MovementRow from "./MovementRow";

type Props = {
  movements: EnhancedTransaction[];
  onSeeAll?: () => void;
};

export default function RecentMovements({ movements, onSeeAll }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Últimos movimientos</h2>
        {onSeeAll ? (
          <button type="button" className="btn-link" onClick={onSeeAll}>
            Ver todos →
          </button>
        ) : null}
      </div>
      {movements.length === 0 ? (
        <p className="text-caption">Sin movimientos recientes.</p>
      ) : (
        <div className="space-y-2">
          {movements.map((tx) => (
            <MovementRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </section>
  );
}
