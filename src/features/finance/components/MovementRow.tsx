"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EnhancedTransaction } from "../FinancialDatabase";
import { formatMovementDate } from "../cashflow-analytics";
import { buildTransactionTrace } from "../finance-linking";
import { useFinance } from "../FinancialDbProvider";
import { money } from "@/lib/money";
import BudgetLinkDetailPanel, { linkReviewBadge } from "./BudgetLinkDetailPanel";

type Props = {
  tx: EnhancedTransaction;
  onEdit?: (tx: EnhancedTransaction) => void;
};

export default function MovementRow({ tx, onEdit }: Props) {
  const { db } = useFinance();
  const [expanded, setExpanded] = useState(false);
  const trace = buildTransactionTrace(db, tx);
  const isIncome = tx.type === "income";
  const conceptName = trace.conceptName;
  const badge = linkReviewBadge(tx.linkReviewStatus, Boolean(tx.budgetConceptId));

  return (
    <div className="surface-soft overflow-hidden">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2 flex items-center text-ink-faint shrink-0"
          aria-expanded={expanded}
        >
          <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        <button
          type="button"
          onClick={() => onEdit?.(tx)}
          disabled={!onEdit}
          className="flex-1 min-w-0 px-1 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[rgb(var(--ink-rgb) / 0.03)] transition-colors disabled:hover:bg-transparent"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-[0.625rem] font-semibold shrink-0 ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-micro text-ink-faint">{formatMovementDate(tx.date)}</span>
              {conceptName ? (
                <span className="text-micro text-ink-muted truncate max-w-[180px]">{conceptName}</span>
              ) : (
                <span className="text-micro text-ink-faint">Sin concepto</span>
              )}
              {tx.source === "shopping_trip" ? (
                <span className="px-1.5 py-0.5 rounded bg-[rgb(var(--ink-rgb) / 0.06)] text-ink-faint text-[0.625rem] font-semibold">
                  super
                </span>
              ) : null}
            </div>
          </div>
          <p
            className={`text-sm font-semibold tabular-nums shrink-0 ${
              isIncome ? "movement-amt-in" : "movement-amt-out"
            }`}
          >
            {isIncome ? "+" : "−"}
            {money(tx.originalAmount ?? tx.amount)}
          </p>
        </button>
      </div>

      {expanded ? (
        <div className="px-3 pb-3 border-t border-[var(--border-hairline)]">
          <BudgetLinkDetailPanel mode="transaction" tx={tx} />
        </div>
      ) : null}
    </div>
  );
}
