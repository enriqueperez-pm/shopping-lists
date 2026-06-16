"use client";

import { useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import { getBudgetConceptsForTypeAndDate, applyConceptCategoryToTransaction } from "./finance-linking";

export default function QuickIncomeModal({ onClose }: { onClose: () => void }) {
  const { db, refresh } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const concepts = getBudgetConceptsForTypeAndDate(db, "income", today);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? "");

  const save = () => {
    const value = Number(amount);
    if (!value) return;
    const concept = concepts.find((c) => c.id === conceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: "income",
      budgetConceptId: conceptId,
      category: concept?.category,
      subcategory: concept?.subcategory,
    });
    db.addTransaction({
      type: "income",
      description: description.trim() || concept?.name || "Ingreso",
      amount: value,
      category: cats.category || "Other Income",
      subcategory: cats.subcategory,
      date: today,
      currency: "MXN",
      originalAmount: value,
      originalCurrency: "MXN",
      source: "manual",
      budgetConceptId: conceptId || undefined,
    });
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md surface-soft p-4 space-y-3">
        <h2 className="text-title">Ingreso rápido</h2>
        <label className="block space-y-1">
          <span className="modal-label">Descripción</span>
          <input
            placeholder="Ej. Nómina, freelance…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="modal-input"
          />
        </label>
        <label className="block space-y-1">
          <span className="modal-label">Monto MXN</span>
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="modal-input tabular-nums"
          />
        </label>
        <label className="block space-y-1">
          <span className="modal-label">Concepto</span>
          <select
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            className="modal-input bg-white"
          >
            {concepts.length === 0 ? (
              <option value="">Sin conceptos este mes</option>
            ) : (
              concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!concepts.length}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
