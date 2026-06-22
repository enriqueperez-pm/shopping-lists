"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/components/ui/ModalShell";
import { money } from "@/lib/money";
import { getTransactionsForConcept } from "../finance-crud";
import { formatCategoryPath } from "../finance-linking";
import { useFinance } from "../FinancialDbProvider";
import type { BudgetConceptAnalysis } from "../budget-analytics";

type Props = {
  row: BudgetConceptAnalysis;
  pending: number;
  onClose: () => void;
  onRegister: () => void;
  onEdit: () => void;
};

export default function ConceptDetailSheet({
  row,
  pending,
  onClose,
  onRegister,
  onEdit,
}: Props) {
  const router = useRouter();
  const { db, transactions } = useFinance();
  const isIncome = row.concept.type === "income";
  const pct =
    row.budgeted > 0 ? Math.min(999, Math.round((row.actual / row.budgeted) * 100)) : 0;

  const recentTx = useMemo(
    () => getTransactionsForConcept(transactions, row.concept.id).slice(0, 5),
    [transactions, row.concept.id],
  );

  const viewMovements = () => {
    onClose();
    router.push(`/gastos?concept=${encodeURIComponent(row.concept.id)}`);
  };

  return (
    <ModalShell open onClose={onClose} variant="sheet" title={row.concept.name}>
      <div className="space-y-4">
        <p className="text-caption text-ink-faint">{formatCategoryPath(row.concept)}</p>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-micro text-ink-faint uppercase">Ejecutado</p>
            <p className="text-base font-bold tabular-nums mt-0.5">{money(row.actual)}</p>
          </div>
          <div>
            <p className="text-micro text-ink-faint uppercase">Presup.</p>
            <p className="text-base font-bold tabular-nums mt-0.5">{money(row.budgeted)}</p>
          </div>
          <div>
            <p className="text-micro text-ink-faint uppercase">Por pagar</p>
            <p className="text-base font-bold tabular-nums text-cart mt-0.5">{money(pending)}</p>
          </div>
        </div>

        {row.budgeted > 0 ? (
          <div>
            <div className="flex justify-between text-micro text-ink-faint mb-1">
              <span>Avance</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[rgb(var(--ink-rgb)/0.06)] overflow-hidden">
              <div
                className={`h-full rounded-full ${isIncome ? "bg-pantry" : pct >= 100 ? "bg-danger" : "bg-pantry"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary justify-center col-span-2" onClick={onRegister}>
            {isIncome ? "Registrar ingreso" : "Registrar pago"}
          </button>
          <button type="button" className="btn-soft justify-center" onClick={onEdit}>
            Editar concepto
          </button>
          <button type="button" className="btn-soft justify-center" onClick={viewMovements}>
            Ver movimientos
          </button>
        </div>

        {recentTx.length > 0 ? (
          <div className="border-t border-[var(--border-hairline)] pt-3 space-y-2">
            <p className="text-micro font-semibold text-ink-faint uppercase">Recientes</p>
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-ink-muted">{tx.description}</span>
                <span className="tabular-nums font-semibold shrink-0">
                  {tx.type === "income" ? "+" : "−"}
                  {money(tx.originalAmount ?? tx.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
