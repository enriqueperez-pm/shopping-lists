"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "./FinancialDbProvider";
import { resolveBudgetConceptId } from "./finance-linking";
import { isCanonicalPair } from "./taxonomy-canonical";
import CategorySubcategoryPicker from "./components/CategorySubcategoryPicker";
import { isCanonicalPair } from "./taxonomy-canonical";

export default function QuickExpenseModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { db, refresh, selectedPeriod } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = today.startsWith(selectedPeriod) ? today : `${selectedPeriod}-01`;
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  useEffect(() => {
    if (subcategory === "Delivery" && !description.trim()) {
      setDescription("Uber Eats");
    }
    if (subcategory === "Tienda" && !description.trim()) {
      setDescription("OXXO");
    }
  }, [subcategory, description]);

  const save = () => {
    const value = Number(amount);
    if (!value || !description.trim() || !date || !category || !subcategory) return;
    if (!isCanonicalPair("expense", category, subcategory)) {
      window.alert("Categoría no válida. Elige de la taxonomía canónica.");
      return;
    }
    const period = date.slice(0, 7);
    const conceptId = resolveBudgetConceptId(db, period, "expense", category, subcategory);
    db.addTransaction({
      type: "expense",
      description: description.trim(),
      amount: value,
      category,
      subcategory,
      date,
      currency: "MXN",
      originalAmount: value,
      originalCurrency: "MXN",
      source: "manual",
      budgetConceptId: conceptId,
      linkReviewStatus: conceptId ? "confirmed" : "pending",
      accountId: "acc_mercado_pago",
    });
    refresh();
    onClose();
  };

  return (
    <ModalShell open onClose={onClose} title="Gasto rápido" className="space-y-4">
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
          placeholder="Uber Eats, OXXO, Renta…"
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
      <CategorySubcategoryPicker
        type="expense"
        category={category}
        subcategory={subcategory}
        onCategoryChange={setCategory}
        onSubcategoryChange={setSubcategory}
      />
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={!amount || !description.trim() || !category || !subcategory}
        >
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}
