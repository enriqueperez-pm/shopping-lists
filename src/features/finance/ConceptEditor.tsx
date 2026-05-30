"use client";

import { useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import type { BudgetConcept } from "./types";

type Props = {
  concept?: BudgetConcept;
  onClose: () => void;
  onSaved?: () => void;
};

export default function ConceptEditor({ concept, onClose, onSaved }: Props) {
  const { db, refresh } = useFinance();
  const [draft, setDraft] = useState({
    budgetedAmount: concept?.budgetedAmount ?? 0,
    isFixed: concept?.isFixed ?? false,
    description: concept?.description ?? "",
  });

  const save = () => {
    if (!concept) return;
    const all = db.getModuleData<BudgetConcept>("budgetConcepts");
    const next = all.map((c) =>
      c.id === concept.id
        ? {
            ...c,
            budgetedAmount: Number(draft.budgetedAmount) || 0,
            isFixed: draft.isFixed,
            description: draft.description,
            updatedAt: new Date().toISOString(),
          }
        : c,
    );
    db.setModuleData("budgetConcepts", next);
    refresh();
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md surface-soft p-4 space-y-4">
        <h2 className="text-title">{concept?.name ?? "Concepto"}</h2>
        <label className="block space-y-1">
          <span className="text-micro text-ink-faint">Presupuesto (MXN)</span>
          <input
            type="number"
            min={0}
            value={draft.budgetedAmount}
            onChange={(e) => setDraft((d) => ({ ...d, budgetedAmount: Number(e.target.value) }))}
            className="w-full rounded-lg border border-[var(--border-hairline)] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isFixed}
            onChange={(e) => setDraft((d) => ({ ...d, isFixed: e.target.checked }))}
          />
          Gasto fijo
        </label>
        <label className="block space-y-1">
          <span className="text-micro text-ink-faint">Notas</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border-hairline)] px-3 py-2 text-sm min-h-[4rem]"
          />
        </label>
        <div className="flex gap-2 justify-end">
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
