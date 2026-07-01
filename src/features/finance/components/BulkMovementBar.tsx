"use client";

import { useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "../FinancialDbProvider";
import { bulkAssignCategory } from "../finance-crud";
import type { EnhancedTransaction } from "../FinancialDatabase";
import CategorySubcategoryPicker from "./CategorySubcategoryPicker";

type Props = {
  selectedIds: string[];
  selectedTxs: EnhancedTransaction[];
  onClear: () => void;
  onDone: () => void;
};

export default function BulkMovementBar({ selectedIds, selectedTxs, onClear, onDone }: Props) {
  const { db, refresh } = useFinance();
  const [showAssign, setShowAssign] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const count = selectedIds.length;
  const hasIncome = selectedTxs.some((t) => t.type === "income");
  const hasExpense = selectedTxs.some((t) => t.type !== "income");
  const mixedTypes = hasIncome && hasExpense;
  const assignType = hasExpense ? "expense" : "income";

  const handleDelete = () => {
    if (!window.confirm(`¿Eliminar ${count} movimiento${count === 1 ? "" : "s"}?`)) return;
    db.deleteTransactions(selectedIds);
    refresh();
    onDone();
  };

  const handleAssign = () => {
    if (!category || !subcategory) return;
    const updated = bulkAssignCategory(db, selectedIds, category, subcategory);
    if (updated === 0) {
      window.alert(
        mixedTypes
          ? "No se pudo asignar: mezclaste ingresos y gastos. Selecciona solo un tipo."
          : "No se pudo asignar la categoría.",
      );
      return;
    }
    refresh();
    setShowAssign(false);
    setCategory("");
    setSubcategory("");
    onDone();
  };

  if (count === 0) return null;

  return (
    <>
      <div className="sticky bottom-[var(--finance-nav-h,80px)] z-40 -mx-[var(--pad,1rem)] px-[var(--pad,1rem)] py-2 bg-[var(--bg-cream)] border-y border-[var(--border-hairline)] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold text-ink shrink-0">
            {count} seleccionado{count === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className="btn-soft text-xs py-1.5 px-2.5"
            onClick={() => setShowAssign(true)}
            disabled={mixedTypes}
            title={mixedTypes ? "Selecciona solo gastos o solo ingresos" : undefined}
          >
            Asignar categoría
          </button>
          <button type="button" className="btn-soft text-xs py-1.5 px-2.5 text-danger" onClick={handleDelete}>
            Eliminar
          </button>
          <button type="button" className="btn-link text-xs ml-auto" onClick={onClear}>
            Cancelar
          </button>
        </div>
      </div>

      {showAssign ? (
        <ModalShell open onClose={() => setShowAssign(false)} title="Asignar categoría" className="space-y-4">
          <p className="text-caption text-ink-muted">
            {count} movimiento{count === 1 ? "" : "s"} · {assignType === "expense" ? "Gastos" : "Ingresos"}
          </p>
          <CategorySubcategoryPicker
            type={assignType}
            category={category}
            subcategory={subcategory}
            onCategoryChange={setCategory}
            onSubcategoryChange={setSubcategory}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-soft" onClick={() => setShowAssign(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAssign}
              disabled={!category || !subcategory}
            >
              Aplicar
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
