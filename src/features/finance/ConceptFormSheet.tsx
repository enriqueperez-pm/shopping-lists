"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "./FinancialDbProvider";
import type { BudgetConcept } from "./types";
import {
  deleteBudgetConcept,
  duplicateBudgetConcept,
  updateBudgetConcept,
} from "./finance-crud";
import {
  createBudgetConcept,
} from "./finance-linking";
import {
  getCanonicalCategories,
  getCanonicalSubcategories,
  isCanonicalPair,
} from "./taxonomy-canonical";

type Props = {
  concept?: BudgetConcept | null;
  type: "income" | "expense";
  onClose: () => void;
  onSaved?: () => void;
};

export default function ConceptFormSheet({ concept, type, onClose, onSaved }: Props) {
  const { db, selectedPeriod, refresh } = useFinance();
  const isEdit = Boolean(concept);

  const canonicalCategories = useMemo(() => getCanonicalCategories(type), [type]);

  const [name, setName] = useState(concept?.name ?? "");
  const [category, setCategory] = useState(concept?.category ?? canonicalCategories[0] ?? "");
  const [subcategory, setSubcategory] = useState(concept?.subcategory ?? "");
  const [budgetedAmount, setBudgetedAmount] = useState(String(concept?.budgetedAmount ?? ""));
  const [isFixed, setIsFixed] = useState(concept?.isFixed ?? false);
  const [description, setDescription] = useState(concept?.description ?? "");

  const subcategories = useMemo(() => {
    if (!category) return [];
    return getCanonicalSubcategories(type, category);
  }, [type, category]);

  const save = () => {
    if (!name.trim() || !category.trim() || !subcategory.trim()) return;
    if (!isCanonicalPair(type, category, subcategory)) {
      window.alert("Solo taxonomía canónica.");
      return;
    }

    if (isEdit && concept) {
      updateBudgetConcept(db, concept.id, {
        name: name.trim(),
        category: category.trim(),
        subcategory: subcategory.trim() || undefined,
        budgetedAmount: Number(budgetedAmount) || 0,
        isFixed,
        description: description.trim() || undefined,
      });
    } else {
      createBudgetConcept(db, {
        period: selectedPeriod,
        type,
        category: category.trim(),
        subcategory: subcategory.trim() || undefined,
        name: name.trim(),
        budgetedAmount: Number(budgetedAmount) || 0,
        isFixed,
        description: description.trim() || undefined,
      });
    }
    refresh();
    onSaved?.();
    onClose();
  };

  const handleDuplicate = () => {
    if (!concept) return;
    duplicateBudgetConcept(db, concept.id);
    refresh();
    onSaved?.();
    onClose();
  };

  const handleDelete = () => {
    if (!concept) return;
    if (!window.confirm(`¿Eliminar "${concept.name}"? Los gastos quedarán sin vínculo.`)) return;
    deleteBudgetConcept(db, concept.id);
    refresh();
    onSaved?.();
    onClose();
  };

  const title = isEdit
    ? concept?.name ?? "Editar concepto"
    : type === "expense"
      ? "Nuevo concepto de gasto"
      : "Nuevo concepto de ingreso";

  return (
    <ModalShell open onClose={onClose} title={title} className="space-y-4">
      <label className="block space-y-1">
        <span className="modal-label">Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="modal-input" />
      </label>

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
          {canonicalCategories.map((cat) => (
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
          <option value="">Sin subcategoría</option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="modal-label">Presupuesto (MXN)</span>
        <input
          type="number"
          min={0}
          value={budgetedAmount}
          onChange={(e) => setBudgetedAmount(e.target.value)}
          className="modal-input tabular-nums"
        />
      </label>

      <label className="block space-y-1">
        <span className="modal-label">Notas</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="modal-input min-h-[72px]"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} />
        {type === "expense" ? "Gasto fijo" : "Ingreso fijo"}
      </label>

      <div className="flex flex-wrap gap-2 justify-end pt-1">
        {isEdit ? (
          <>
            <button type="button" className="btn-soft text-danger" onClick={handleDelete}>
              Eliminar
            </button>
            <button type="button" className="btn-soft" onClick={handleDuplicate}>
              Duplicar
            </button>
          </>
        ) : null}
        <button type="button" className="btn-soft" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={!name.trim() || !category.trim()}
        >
          {isEdit ? "Guardar" : "Crear"}
        </button>
      </div>
    </ModalShell>
  );
}
