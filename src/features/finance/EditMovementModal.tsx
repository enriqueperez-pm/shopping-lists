"use client";

import { useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import type { EnhancedTransaction } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import { money } from "@/lib/money";

type Props = {
  tx: EnhancedTransaction;
  onClose: () => void;
};

export default function EditMovementModal({ tx, onClose }: Props) {
  const { db, refresh } = useFinance();
  const [date, setDate] = useState(tx.date.slice(0, 10));

  const save = () => {
    if (!date) return;
    db.updateTransaction(tx.id, { date });
    refresh();
    onClose();
  };

  const isIncome = tx.type === "income";

  return (
    <ModalShell open onClose={onClose} title="Editar movimiento">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{tx.description}</p>
        <p className={`text-sm font-semibold tabular-nums ${isIncome ? "movement-amt-in" : "movement-amt-out"}`}>
          {isIncome ? "+" : "−"}
          {money(tx.originalAmount ?? tx.amount)}
        </p>
      </div>
      <label className="block space-y-1">
        <span className="modal-label">Fecha del movimiento</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="modal-input"
        />
      </label>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={save} disabled={!date}>
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}
