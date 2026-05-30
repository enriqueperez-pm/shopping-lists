"use client";

import { useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import { getBudgetConceptsForTypeAndDate, applyConceptCategoryToTransaction } from "./finance-linking";

export default function QuickExpenseModal({ onClose }: { onClose: () => void }) {
  const { db, refresh } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const concepts = getBudgetConceptsForTypeAndDate(db, "expense", today);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? "");

  const save = () => {
    const value = Number(amount);
    if (!value || !description.trim()) return;
    const concept = concepts.find((c) => c.id === conceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: "expense",
      budgetConceptId: conceptId,
      category: concept?.category,
      subcategory: concept?.subcategory,
    });
    db.addTransaction({
      type: "expense",
      description: description.trim(),
      amount: value,
      category: cats.category || "Other",
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md surface-soft p-4 space-y-3">
        <h2 className="text-title">Gasto rápido</h2>
        <input
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-hairline)] px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Monto MXN"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-hairline)] px-3 py-2 text-sm"
        />
        <select
          value={conceptId}
          onChange={(e) => setConceptId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-hairline)] px-3 py-2 text-sm bg-white"
        >
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.category} / {c.subcategory || c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
