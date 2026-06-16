"use client";

import type { EnhancedTransaction } from "../FinancialDatabase";
import { formatMovementDate, movementCategoryLabel } from "../cashflow-analytics";
import { money } from "@/lib/money";

type Props = {
  tx: EnhancedTransaction;
  onEdit?: (tx: EnhancedTransaction) => void;
};

export default function MovementRow({ tx, onEdit }: Props) {
  const tag = movementCategoryLabel(tx);
  const isIncome = tx.type === "income";

  const content = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-micro text-ink-faint">{formatMovementDate(tx.date)}</p>
        {tag ? (
          <span className="inline-flex mt-1 px-1.5 py-0.5 rounded-md text-[0.625rem] font-medium bg-[rgba(21,49,49,0.04)] text-ink-faint">
            {tag}
          </span>
        ) : null}
        {tx.source === "shopping_trip" ? (
          <span className="inline-flex ml-1 mt-1 px-1.5 py-0.5 rounded bg-[rgba(21,49,49,0.06)] text-ink-faint text-[0.625rem] font-semibold">
            super
          </span>
        ) : null}
      </div>
      <p
        className={`text-sm font-semibold tabular-nums shrink-0 ${
          isIncome ? "movement-amt-in" : "movement-amt-out"
        }`}
      >
        {isIncome ? "+" : "−"}
        {money(tx.originalAmount ?? tx.amount)}
      </p>
    </>
  );

  if (onEdit) {
    return (
      <button
        type="button"
        onClick={() => onEdit(tx)}
        className="surface-soft px-3 py-2.5 flex justify-between gap-3 w-full text-left hover:bg-[rgba(21,49,49,0.03)] transition-colors"
      >
        {content}
      </button>
    );
  }

  return <div className="surface-soft px-3 py-2.5 flex justify-between gap-3">{content}</div>;
}
