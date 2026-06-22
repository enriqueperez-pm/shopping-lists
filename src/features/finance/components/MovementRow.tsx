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
  variant?: "card" | "list";
};

export default function MovementRow({ tx, onEdit, variant = "list" }: Props) {
  const { db } = useFinance();
  const [expanded, setExpanded] = useState(false);
  const trace = buildTransactionTrace(db, tx);
  const isIncome = tx.type === "income";
  const conceptName = trace.conceptName;
  const badge = linkReviewBadge(tx.linkReviewStatus, Boolean(tx.budgetConceptId));

  const wrapperClass =
    variant === "list"
      ? "border-b border-[var(--border-hairline)] last:border-b-0"
      : "surface-soft overflow-hidden rounded-xl";

  return (
    <div className={wrapperClass}>
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
          className="finance-list-row flex-1 border-b-0 min-w-0 disabled:opacity-100"
        >
          <div className="min-w-0 flex-1 text-left">
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
        <div className="px-3 pb-3 border-t border-[var(--border-hairline)] bg-[rgb(var(--ink-rgb)/0.015)]">
          <BudgetLinkDetailPanel mode="transaction" tx={tx} />
        </div>
      ) : null}
    </div>
  );
}
