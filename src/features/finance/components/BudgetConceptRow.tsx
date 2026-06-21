"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, MoreHorizontal, Pencil } from "lucide-react";
import { money } from "@/lib/money";
import type { BudgetConceptAnalysis } from "../budget-analytics";
import type { BudgetConcept } from "../types";
import type { EnhancedTransaction } from "../FinancialDatabase";
import BudgetLinkDetailPanel, { linkReviewBadge } from "./BudgetLinkDetailPanel";
import { countLinkReviewPending } from "../finance-crud";

type Props = {
  row: BudgetConceptAnalysis;
  transactions: EnhancedTransaction[];
  onEdit: (concept: BudgetConcept) => void;
  muted?: boolean;
  periodLabel?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  organizeMode?: boolean;
};

function usageTone(isIncome: boolean, pct: number) {
  if (isIncome) {
    return pct >= 100 ? "bg-pantry" : pct >= 80 ? "bg-cart" : "bg-danger";
  }
  return pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-cart" : "bg-pantry";
}

export default function BudgetConceptRow({
  row,
  transactions,
  onEdit,
  muted,
  periodLabel,
  dragHandleProps,
  organizeMode,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isIncome = row.concept.type === "income";
  const hasBudget = row.budgeted > 0;
  const pct = hasBudget ? Math.min(999, Math.round((row.actual / row.budgeted) * 100)) : 0;
  const pctDisplay = hasBudget ? `${pct}%` : "—";
  const pending = countLinkReviewPending(transactions, row.concept.id);
  const linkedCount = transactions.filter((tx) => tx.budgetConceptId === row.concept.id).length;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        muted
          ? "border-[var(--border-hairline)] bg-[rgb(var(--ink-rgb) / 0.02)]"
          : "border-[var(--border-soft)] bg-white shadow-card"
      }`}
    >
      <div className="flex items-center gap-1 px-2 py-2.5">
        {organizeMode ? (
          <button
            type="button"
            className="p-1 text-ink-faint shrink-0 cursor-grab active:cursor-grabbing"
            aria-label="Arrastrar"
            {...dragHandleProps}
          >
            <GripVertical size={16} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-ink-faint shrink-0"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => onEdit(row.concept)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold text-ink truncate flex-1">
              {row.concept.name}
              {periodLabel ? (
                <span className="text-ink-faint font-medium"> · {periodLabel}</span>
              ) : null}
            </p>
            {linkedCount > 0 ? (
              <span className="text-micro text-ink-faint shrink-0">
                {linkedCount} mov{pending > 0 ? ` · ${pending} ⚠` : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold tabular-nums text-ink">
              {money(row.actual)}
              <span className="text-ink-faint font-medium mx-1">/</span>
              <span className="text-ink-muted font-semibold">{money(row.budgeted)}</span>
            </p>
            <span
              className={`text-sm font-bold tabular-nums shrink-0 ${
                !hasBudget
                  ? "text-ink-faint"
                  : pct >= 100
                    ? isIncome
                      ? "text-pantry"
                      : "text-danger"
                    : "text-ink-muted"
              }`}
            >
              {pctDisplay}
            </span>
          </div>

          {hasBudget ? (
            <div className="mt-1.5 h-1 rounded-full bg-[rgb(var(--ink-rgb) / 0.06)] overflow-hidden">
              <div
                className={`h-full rounded-full ${usageTone(isIncome, Math.min(pct, 100))}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          ) : null}
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            className="p-1.5 text-ink-faint hover:text-ink"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Acciones"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-[var(--border-soft)] bg-white shadow-card py-1">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-[rgb(var(--ink-rgb) / 0.04)] flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(row.concept);
                }}
              >
                <Pencil size={14} />
                Editar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="px-3 pb-3">
          <BudgetLinkDetailPanel
            mode="concept"
            concept={row.concept}
            transactions={transactions}
          />
        </div>
      ) : null}
    </div>
  );
}
