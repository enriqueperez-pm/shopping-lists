"use client";

import type { EnhancedTransaction } from "../FinancialDatabase";
import MovementRow from "./MovementRow";

type Props = {
  movements: EnhancedTransaction[];
  onSeeAll?: () => void;
  onEditMovement?: (tx: EnhancedTransaction) => void;
  /** Sin wrapper de sección; filas dentro de finance-list */
  embedded?: boolean;
};

export default function RecentMovements({
  movements,
  onSeeAll,
  onEditMovement,
  embedded,
}: Props) {
  const list = (
    <>
      {movements.length === 0 ? (
        <p className={`text-caption ${embedded ? "px-3 py-4" : ""}`}>Sin movimientos recientes.</p>
      ) : (
        movements.map((tx) => (
          <MovementRow key={tx.id} tx={tx} onEdit={onEditMovement} variant="list" />
        ))
      )}
    </>
  );

  if (embedded) {
    return list;
  }

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
      <div className="finance-list">{list}</div>
    </section>
  );
}
