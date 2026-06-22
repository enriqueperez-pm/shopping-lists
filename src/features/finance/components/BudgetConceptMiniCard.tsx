"use client";

import { Pencil, Plus } from "lucide-react";
import { money } from "@/lib/money";
import type { BudgetConceptAnalysis } from "../budget-analytics";

type Props = {
  row: BudgetConceptAnalysis;
  pending?: number;
  variant: "income" | "expense";
  onEdit: () => void;
  onRegister?: () => void;
};

function usageTone(isIncome: boolean, pct: number) {
  if (isIncome) {
    return pct >= 100 ? "bg-pantry" : pct >= 80 ? "bg-cart" : "bg-danger/80";
  }
  return pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-cart" : "bg-pantry";
}

export default function BudgetConceptMiniCard({
  row,
  pending,
  variant,
  onEdit,
  onRegister,
}: Props) {
  const isIncome = variant === "income";
  const hasBudget = row.budgeted > 0;
  const pct = hasBudget ? Math.min(999, Math.round((row.actual / row.budgeted) * 100)) : 0;
  const path = row.concept.subcategory
    ? `${row.concept.category} · ${row.concept.subcategory}`
    : row.concept.category;

  return (
    <article
      className={`surface-soft p-3 flex flex-col gap-2 h-full ${
        isIncome ? "border-l-[3px] border-l-pantry" : pending && pending > 0 ? "border-l-[3px] border-l-cart" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{row.concept.name}</p>
        <p className="text-micro text-ink-faint truncate mt-0.5">{path}</p>
        <p className="text-base font-bold tabular-nums text-ink mt-2">
          {money(row.actual)}
          <span className="text-ink-faint font-medium mx-1">/</span>
          <span className="text-ink-muted font-semibold text-sm">{money(row.budgeted)}</span>
        </p>
        {pending != null && pending > 0 ? (
          <p className="text-micro font-semibold text-cart mt-1">Por pagar {money(pending)}</p>
        ) : null}
        {hasBudget ? (
          <div className="mt-2 h-1.5 rounded-full bg-[rgb(var(--ink-rgb)/0.06)] overflow-hidden">
            <div
              className={`h-full rounded-full ${usageTone(isIncome, Math.min(pct, 100))}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        ) : (
          <p className="text-micro text-ink-faint mt-2">Sin monto presupuestado</p>
        )}
      </div>

      <div className="flex gap-1.5 pt-1">
        {onRegister ? (
          <button
            type="button"
            className="btn-primary flex-1 justify-center gap-1 py-1.5 text-xs"
            onClick={onRegister}
          >
            <Plus size={14} />
            {isIncome ? "Registrar" : "Pagar"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-soft px-2.5 py-1.5"
          onClick={onEdit}
          aria-label={`Editar ${row.concept.name}`}
        >
          <Pencil size={14} />
        </button>
      </div>
    </article>
  );
}
