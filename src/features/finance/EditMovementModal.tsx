"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import type { EnhancedTransaction } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import {
  applyConceptCategoryToTransaction,
  getBudgetConceptsForTypeAndDate,
  groupBudgetConceptsByCategory,
} from "./finance-linking";

type Props = {
  tx: EnhancedTransaction;
  onClose: () => void;
};

export default function EditMovementModal({ tx, onClose }: Props) {
  const { db, refresh } = useFinance();
  const txType = tx.type === "income" ? "income" : "expense";
  const [date, setDate] = useState(tx.date.slice(0, 10));
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.originalAmount ?? tx.amount));
  const [conceptId, setConceptId] = useState(tx.budgetConceptId ?? "");

  const concepts = useMemo(
    () => getBudgetConceptsForTypeAndDate(db, txType, date),
    [db, txType, date],
  );
  const conceptGroups = useMemo(() => groupBudgetConceptsByCategory(concepts), [concepts]);

  useEffect(() => {
    if (!conceptId && concepts[0]) setConceptId(concepts[0].id);
    if (conceptId && !concepts.some((c) => c.id === conceptId)) {
      setConceptId(concepts[0]?.id ?? "");
    }
  }, [concepts, conceptId]);

  const save = () => {
    const value = Number(amount);
    if (!date || !description.trim() || !value) return;

    const concept = concepts.find((c) => c.id === conceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: txType,
      budgetConceptId: conceptId || undefined,
      category: concept?.category ?? tx.category,
      subcategory: concept?.subcategory ?? tx.subcategory,
    });

    db.updateTransaction(tx.id, {
      date,
      description: description.trim(),
      amount: value,
      originalAmount: value,
      originalCurrency: tx.originalCurrency ?? "MXN",
      currency: tx.currency ?? "MXN",
      category: cats.category ?? tx.category,
      subcategory: cats.subcategory,
      budgetConceptId: conceptId || undefined,
    });
    refresh();
    onClose();
  };

  const isIncome = tx.type === "income";

  return (
    <ModalShell open onClose={onClose} title="Editar movimiento" className="space-y-4">
      <label className="block space-y-1">
        <span className="modal-label">Fecha</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="modal-input"
        />
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Descripción</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="modal-input"
        />
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Monto MXN</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="modal-input tabular-nums"
        />
      </label>
      {concepts.length > 0 ? (
        <label className="block space-y-1">
          <span className="modal-label">Concepto</span>
          <select
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            className="modal-input bg-white"
          >
            {conceptGroups.map(({ category, concepts: groupConcepts }) => (
              <optgroup key={category} label={category}>
                {groupConcepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subcategory ? `${c.subcategory} — ` : ""}
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={!date || !description.trim() || !Number(amount)}
        >
          Guardar
        </button>
      </div>
      {tx.source === "shopping_trip" ? (
        <p className="text-micro text-ink-faint">Compra del super — puedes ajustar fecha y monto aquí.</p>
      ) : null}
    </ModalShell>
  );
}
