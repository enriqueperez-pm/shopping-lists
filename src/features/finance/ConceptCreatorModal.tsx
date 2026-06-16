"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "./FinancialDbProvider";
import {
  createBudgetConcept,
  getDistinctCategories,
  getDistinctSubcategories,
} from "./finance-linking";

type Props = {
  type: "income" | "expense";
  onClose: () => void;
  onSaved?: () => void;
};

export default function ConceptCreatorModal({ type, onClose, onSaved }: Props) {
  const { db, selectedPeriod, refresh } = useFinance();
  const existingCategories = useMemo(() => getDistinctCategories(db, type), [db, type]);

  const [categoryMode, setCategoryMode] = useState<"existing" | "new">(
    existingCategories.length ? "existing" : "new",
  );
  const [category, setCategory] = useState(existingCategories[0] ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [subcategoryMode, setSubcategoryMode] = useState<"existing" | "new" | "none">("existing");
  const [subcategory, setSubcategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [name, setName] = useState("");
  const [budgetedAmount, setBudgetedAmount] = useState("");
  const [isFixed, setIsFixed] = useState(false);

  const resolvedCategory = categoryMode === "new" ? newCategory.trim() : category.trim();
  const existingSubcategories = useMemo(
    () => (resolvedCategory ? getDistinctSubcategories(db, type, resolvedCategory) : []),
    [db, type, resolvedCategory],
  );

  const resolvedSubcategory =
    subcategoryMode === "none"
      ? undefined
      : subcategoryMode === "new"
        ? newSubcategory.trim() || undefined
        : subcategory.trim() || undefined;

  const save = () => {
    if (!resolvedCategory || !name.trim()) return;
    createBudgetConcept(db, {
      period: selectedPeriod,
      type,
      category: resolvedCategory,
      subcategory: resolvedSubcategory,
      name: name.trim(),
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
      <fieldset className="space-y-2">
        <legend className="modal-label">Categoría</legend>
        {existingCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={categoryMode === "existing" ? "chip-active" : "chip"}
              onClick={() => setCategoryMode("existing")}
            >
              Existente
            </button>
            <button
              type="button"
              className={categoryMode === "new" ? "chip-active" : "chip"}
              onClick={() => setCategoryMode("new")}
            >
              Nueva
            </button>
          </div>
        ) : null}
        {categoryMode === "existing" && existingCategories.length > 0 ? (
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
            className="modal-input bg-white"
          >
            {existingCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="Ej. Housing, Food, Technology…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="modal-input"
          />
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="modal-label">Subcategoría</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={subcategoryMode === "existing" ? "chip-active" : "chip"}
            onClick={() => setSubcategoryMode("existing")}
          >
            Existente
          </button>
          <button
            type="button"
            className={subcategoryMode === "new" ? "chip-active" : "chip"}
            onClick={() => setSubcategoryMode("new")}
          >
            Nueva
          </button>
          <button
            type="button"
            className={subcategoryMode === "none" ? "chip-active" : "chip"}
            onClick={() => setSubcategoryMode("none")}
          >
            Sin subcategoría
          </button>
        </div>
        {subcategoryMode === "existing" ? (
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="modal-input bg-white"
          >
            <option value="">Selecciona subcategoría</option>
            {existingSubcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        ) : subcategoryMode === "new" ? (
          <input
            placeholder="Ej. Rent, Groceries, Subscriptions…"
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
            className="modal-input"
          />
        ) : null}
      </fieldset>

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
          disabled={!resolvedCategory || !name.trim()}
        >
          Crear
        </button>
      </div>
    </ModalShell>
  );
}
