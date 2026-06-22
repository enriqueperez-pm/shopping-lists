"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import type { EnhancedTransaction } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import {
  applyConceptCategoryToTransaction,
  formatCategoryPath,
  getBudgetConceptsForTypeAndDate,
} from "./finance-linking";
import { recordRecentConceptId } from "./finance-crud";
import SearchableConceptPicker from "./components/SearchableConceptPicker";

type Props = {
  tx: EnhancedTransaction;
  onClose: () => void;
};

export default function EditMovementModal({ tx, onClose }: Props) {
  const { db, refresh, selectedPeriod } = useFinance();
  const txType = tx.type === "income" ? "income" : "expense";
  const banks = useMemo(() => db.getBanks(), [db]);
  const accounts = useMemo(() => db.getAccounts(), [db]);
  const recentIds = db.getUserPreferences().recentConceptIds ?? [];
  const [date, setDate] = useState(tx.date.slice(0, 10));
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.originalAmount ?? tx.amount));
  const [conceptId, setConceptId] = useState(tx.budgetConceptId ?? "");
  const [bankId, setBankId] = useState(tx.bankId ?? "");
  const [accountId, setAccountId] = useState(tx.accountId ?? "");

  const accountsForBank = useMemo(
    () => (bankId ? accounts.filter((a) => a.bankId === bankId) : accounts),
    [accounts, bankId],
  );

  const concepts = useMemo(
    () =>
      getBudgetConceptsForTypeAndDate(db, txType, date, {
        selectedPeriod,
        currentConceptId: conceptId || tx.budgetConceptId,
      }),
    [db, txType, date, selectedPeriod, conceptId, tx.budgetConceptId],
  );

  useEffect(() => {
    if (!conceptId && concepts[0]) setConceptId(concepts[0].id);
  }, [concepts, conceptId]);

  useEffect(() => {
    if (accountId && !accounts.some((a) => a.id === accountId)) {
      setAccountId("");
    }
  }, [accounts, accountId]);

  const save = () => {
    const value = Number(amount);
    if (!date || !description.trim() || !value) return;

    const concept = concepts.find((c) => c.id === conceptId);
    const cats = applyConceptCategoryToTransaction(db, {
      type: txType,
      budgetConceptId: conceptId || undefined,
      category: concept?.category ?? tx.category,
      subcategory: concept?.subcategory ?? tx.subcategory,
    });

    db.updateTransaction(tx.id, {
      date,
      description: description.trim(),
      amount: value,
      originalAmount: value,
      originalCurrency: tx.originalCurrency ?? "MXN",
      currency: tx.currency ?? "MXN",
      category: cats.category ?? tx.category,
      subcategory: cats.subcategory,
      budgetConceptId: conceptId || undefined,
      bankId: bankId || undefined,
      accountId: accountId || undefined,
      linkReviewStatus: conceptId ? "pending" : tx.linkReviewStatus,
      source: tx.source === "shopping_trip" ? "shopping_trip" : "manual",
    });
    if (conceptId) recordRecentConceptId(db, conceptId);
    refresh();
    onClose();
  };

  const remove = () => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    db.deleteTransaction(tx.id);
    refresh();
    onClose();
  };

  const isIncome = tx.type === "income";
  const selectedConcept = concepts.find((c) => c.id === conceptId);

  return (
    <ModalShell open onClose={onClose} title="Editar movimiento" className="space-y-4">
      {concepts.length > 0 ? (
        <label className="block space-y-1">
          <span className="modal-label">Concepto de presupuesto</span>
          <SearchableConceptPicker
            concepts={concepts}
            value={conceptId}
            onChange={setConceptId}
            selectedPeriod={selectedPeriod}
            recentIds={recentIds}
            allowEmpty
            emptyLabel="Sin concepto"
          />
          {selectedConcept ? (
            <p className="text-caption text-ink-faint">{formatCategoryPath(selectedConcept)}</p>
          ) : null}
        </label>
      ) : null}

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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="modal-input"
        />
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Monto MXN</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="modal-input tabular-nums"
        />
      </label>
      {banks.length > 0 ? (
        <label className="block space-y-1">
          <span className="modal-label">Banco</span>
          <select
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              setAccountId("");
            }}
            className="modal-input bg-white"
          >
            <option value="">Sin banco</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {accountsForBank.length > 0 ? (
        <label className="block space-y-1">
          <span className="modal-label">Cuenta</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="modal-input bg-white"
          >
            <option value="">Sin cuenta</option>
            {accountsForBank.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2 justify-between pt-1">
        <button type="button" className="btn-soft text-danger" onClick={remove}>
          Eliminar
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={!date || !description.trim() || !Number(amount)}
          >
            Guardar
          </button>
        </div>
      </div>
      {tx.source === "shopping_trip" ? (
        <p className="text-micro text-ink-faint">Compra del super — puedes ajustar fecha y monto aquí.</p>
      ) : null}
    </ModalShell>
  );
}
