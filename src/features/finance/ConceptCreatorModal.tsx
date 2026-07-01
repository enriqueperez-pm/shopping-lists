"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "./FinancialDbProvider";
import {
  createBudgetConcept,
  getDefaultConceptNameForSubcategory,
} from "./finance-linking";
import { getCanonicalCategories, getCanonicalSubcategories, isCanonicalPair } from "./taxonomy-canonical";

type Props = {
  type: "income" | "expense";
  onClose: () => void;
  onSaved?: () => void;
};

export default function ConceptCreatorModal({ type, onClose, onSaved }: Props) {
  const { db, selectedPeriod, refresh } = useFinance();
  const categories = useMemo(() => getCanonicalCategories(type), [type]);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [subcategory, setSubcategory] = useState("");
  const subcategories = useMemo(
    () => (category ? getCanonicalSubcategories(type, category) : []),
    [type, category],
  );
  const [name, setName] = useState("");
  const [budgetedAmount, setBudgetedAmount] = useState("");
  const [isFixed, setIsFixed] = useState(false);

  const save = () => {
    if (!category || !subcategory) return;
    if (!isCanonicalPair(type, category, subcategory)) {
      window.alert("Solo puedes crear conceptos con taxonomía canónica.");
      return;
    }
    const resolvedName = name.trim() || getDefaultConceptNameForSubcategory(subcategory);
    if (!resolvedName) return;
    createBudgetConcept(db, {
      period: selectedPeriod,
      type,
      category,
      subcategory,
      name: resolvedName,
      budgetedAmount: Number(budgetedAmount) || 0,
      isFixed,
    });
    refresh();
    onSaved?.();
    onClose();
  };

  const title = type === "expense" ? "Nuevo concepto de gasto" : "Nuevo concepto de ingreso";

  return (
    <ModalShell open onClose={onClose} title={title} className="space-y-4">
      <label className="block space-y-1">
        <span className="modal-label">Categoría</span>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("");
          }}
          className="modal-input bg-white"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Subcategoría</span>
        <select
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          className="modal-input bg-white"
        >
          <option value="">Selecciona subcategoría</option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Nombre del concepto</span>
        <input
          placeholder={type === "expense" ? "Ej. Renta, Netflix…" : "Ej. Nómina principal…"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="modal-input"
        />
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Presupuesto mensual (MXN)</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          value={budgetedAmount}
          onChange={(e) => setBudgetedAmount(e.target.value)}
          className="modal-input tabular-nums"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
        {type === "expense" ? "Gasto fijo" : "Ingreso fijo"}
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={!category || !subcategory}
        >
          Crear
        </button>
      </div>
    </ModalShell>
  );
}
