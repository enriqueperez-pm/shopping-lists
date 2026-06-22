"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "./FinancialDbProvider";
import {
  getBudgetConceptsForTypeAndDate,
  applyConceptCategoryToTransaction,
} from "./finance-linking";
import { recordRecentConceptId } from "./finance-crud";
import SearchableConceptPicker from "./components/SearchableConceptPicker";
import ConceptCreatorModal from "./ConceptCreatorModal";

export default function QuickExpenseModal({
  onClose,
  initialConceptId,
}: {
  onClose: () => void;
  initialConceptId?: string;
}) {
  const { db, refresh, selectedPeriod } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = today.startsWith(selectedPeriod) ? today : `${selectedPeriod}-01`;
  const [date, setDate] = useState(defaultDate);
  const [conceptsVersion, setConceptsVersion] = useState(0);
  const concepts = useMemo(
    () => getBudgetConceptsForTypeAndDate(db, "expense", date, { selectedPeriod }),
    [db, date, selectedPeriod, conceptsVersion],
  );
  const recentIds = db.getUserPreferences().recentConceptIds ?? [];
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [conceptId, setConceptId] = useState(initialConceptId ?? concepts[0]?.id ?? "");
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    if (initialConceptId && concepts.some((c) => c.id === initialConceptId)) {
      setConceptId(initialConceptId);
      return;
    }
    if (!concepts.some((c) => c.id === conceptId)) {
      setConceptId(concepts[0]?.id ?? "");
    }
  }, [concepts, conceptId, initialConceptId]);

  const save = () => {
    const value = Number(amount);
    if (!value || !description.trim() || !date || !conceptId) return;
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
      date,
      currency: "MXN",
      originalAmount: value,
      originalCurrency: "MXN",
      source: "manual",
      budgetConceptId: conceptId || undefined,
      linkReviewStatus: "pending",
    });
    if (conceptId) recordRecentConceptId(db, conceptId);
    refresh();
    onClose();
  };

  return (
    <>
      <ModalShell open onClose={onClose} title="Gasto rápido">
        <label className="block space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="modal-label">Concepto</span>
            <button
              type="button"
              className="text-xs text-[var(--color-primary)] hover:underline"
              onClick={() => setShowCreator(true)}
            >
              + Nuevo concepto
            </button>
          </div>
          <SearchableConceptPicker
            concepts={concepts}
            value={conceptId}
            onChange={setConceptId}
            selectedPeriod={selectedPeriod}
            recentIds={recentIds}
            placeholder="Selecciona concepto"
          />
        </label>
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
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={!conceptId || !amount || !description.trim()}
          >
            Guardar
          </button>
        </div>
      </ModalShell>

      {showCreator ? (
        <ConceptCreatorModal
          type="expense"
          onClose={() => setShowCreator(false)}
          onSaved={() => {
            setConceptsVersion((v) => v + 1);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}
