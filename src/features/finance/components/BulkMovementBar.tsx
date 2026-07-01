"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import { useFinance } from "../FinancialDbProvider";
import { bulkAssignConcept, bulkConfirmLink } from "../finance-crud";
import { getBudgetConceptsForTypeAndDate } from "../finance-linking";
import type { EnhancedTransaction } from "../FinancialDatabase";
import SearchableConceptPicker from "./SearchableConceptPicker";

type Props = {
  selectedIds: string[];
  selectedTxs: EnhancedTransaction[];
  onClear: () => void;
  onDone: () => void;
};

export default function BulkMovementBar({ selectedIds, selectedTxs, onClear, onDone }: Props) {
  const { db, refresh, selectedPeriod } = useFinance();
  const [showAssign, setShowAssign] = useState(false);
  const [conceptId, setConceptId] = useState("");

  const count = selectedIds.length;
  const hasIncome = selectedTxs.some((t) => t.type === "income");
  const hasExpense = selectedTxs.some((t) => t.type !== "income");
  const mixedTypes = hasIncome && hasExpense;

  const assignType = hasExpense ? "expense" : "income";
  const assignDate =
    selectedTxs.map((t) => t.date.slice(0, 10)).sort()[0] ?? `${selectedPeriod}-01`;

  const concepts = useMemo(
    () =>
      getBudgetConceptsForTypeAndDate(db, assignType, assignDate, {
        selectedPeriod,
        currentConceptId: conceptId || undefined,
      }),
    [db, assignType, assignDate, selectedPeriod, conceptId],
  );

  const recentIds = db.getUserPreferences().recentConceptIds ?? [];
  const withConcept = selectedTxs.filter((t) => t.budgetConceptId).length;

  const handleDelete = () => {
    if (!window.confirm(`¿Eliminar ${count} movimiento${count === 1 ? "" : "s"}?`)) return;
    db.deleteTransactions(selectedIds);
    refresh();
    onDone();
  };

  const handleConfirm = () => {
    const updated = bulkConfirmLink(db, selectedIds);
    if (updated === 0) {
      window.alert("Ningún movimiento seleccionado tiene concepto asignado.");
      return;
    }
    refresh();
    onDone();
  };

  const handleAssign = () => {
    if (!conceptId) return;
    const updated = bulkAssignConcept(db, selectedIds, conceptId);
    if (updated === 0) {
      window.alert(
        mixedTypes
          ? "No se pudo asignar: mezclaste ingresos y gastos. Selecciona solo un tipo."
          : "No se pudo asignar el concepto.",
      );
      return;
    }
    refresh();
    setShowAssign(false);
    setConceptId("");
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
            Asignar concepto
          </button>
          <button
            type="button"
            className="btn-soft text-xs py-1.5 px-2.5"
            onClick={handleConfirm}
            disabled={withConcept === 0}
            title={withConcept === 0 ? "Primero asigna un concepto" : undefined}
          >
            Confirmar ({withConcept})
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
        <ModalShell open onClose={() => setShowAssign(false)} title="Asignar concepto" className="space-y-4">
          <p className="text-caption text-ink-muted">
            Aplica a {count} movimiento{count === 1 ? "" : "s"} ({assignType === "expense" ? "gastos" : "ingresos"}).
          </p>
          <SearchableConceptPicker
            concepts={concepts}
            value={conceptId}
            onChange={setConceptId}
            selectedPeriod={selectedPeriod}
            recentIds={recentIds}
            placeholder="Buscar concepto…"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-soft" onClick={() => setShowAssign(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={!conceptId} onClick={handleAssign}>
              Aplicar
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
