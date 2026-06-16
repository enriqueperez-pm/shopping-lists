"use client";

import { useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
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
    <ModalShell open onClose={onClose} title="Gasto rápido">
      <label className="block space-y-1">
        <span className="modal-label">Descripción</span>
        <input
          placeholder="Ej. Uber Eats, luz…"
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
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.category} / {c.subcategory || c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={save}>
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}
