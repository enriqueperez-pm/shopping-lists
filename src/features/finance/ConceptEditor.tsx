"use client";

import { useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
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
    <ModalShell open onClose={onClose} title={concept?.name ?? "Concepto"} className="space-y-4">
      <label className="block space-y-1">
        <span className="modal-label">Presupuesto (MXN)</span>
        <input
          type="number"
          min={0}
          value={draft.budgetedAmount}
          onChange={(e) => setDraft((d) => ({ ...d, budgetedAmount: Number(e.target.value) }))}
          className="modal-input tabular-nums"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={draft.isFixed}
          onChange={(e) => setDraft((d) => ({ ...d, isFixed: e.target.checked }))}
        />
        Gasto fijo
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Notas</span>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="modal-input min-h-[4rem] resize-y"
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
    </ModalShell>
  );
}
