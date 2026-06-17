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

export default function QuickIncomeModal({ onClose }: { onClose: () => void }) {
  const { db, refresh, selectedPeriod } = useFinance();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = today.startsWith(selectedPeriod) ? today : `${selectedPeriod}-01`;
  const [date, setDate] = useState(defaultDate);
  const concepts = useMemo(
    () => getBudgetConceptsForTypeAndDate(db, "income", date, { selectedPeriod }),
    [db, date, selectedPeriod],
  );
  const recentIds = db.getUserPreferences().recentConceptIds ?? [];
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? "");

  useEffect(() => {
    if (!concepts.some((c) => c.id === conceptId)) {
      setConceptId(concepts[0]?.id ?? "");
    }
  }, [concepts, conceptId]);

  const save = () => {
    const value = Number(amount);
    if (!value || !date) return;
    const concept = concepts.find((c) => c.id === conceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: "income",
      budgetConceptId: conceptId,
      category: concept?.category,
      subcategory: concept?.subcategory,
    });
    db.addTransaction({
      type: "income",
      description: description.trim() || concept?.name || "Ingreso",
      amount: value,
      category: cats.category || "Other Income",
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
    <ModalShell open onClose={onClose} title="Ingreso rápido">
      <label className="block space-y-1">
        <span className="modal-label">Concepto</span>
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
          placeholder="Ej. Nómina, freelance…"
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
        <button type="button" className="btn-primary" onClick={save} disabled={!concepts.length}>
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}
