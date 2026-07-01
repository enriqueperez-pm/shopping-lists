"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ui/ModalShell";
import type { EnhancedTransaction } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import { resolveBudgetConceptId } from "./finance-linking";
import { isCanonicalPair } from "./taxonomy-canonical";
import CategorySubcategoryPicker from "./components/CategorySubcategoryPicker";
import { MASTER_ACCOUNTS, MASTER_BANKS } from "./account-balance";

type Props = {
  tx: EnhancedTransaction;
  onClose: () => void;
};

export default function EditMovementModal({ tx, onClose }: Props) {
  const { db, refresh, selectedPeriod } = useFinance();
  const txType = tx.type === "income" ? "income" : "expense";
  const banks = useMemo(() => {
    const existing = db.getBanks();
    return existing.length > 0 ? existing : MASTER_BANKS;
  }, [db]);
  const accounts = useMemo(() => {
    const existing = db.getAccounts();
    return existing.length > 0 ? existing : MASTER_ACCOUNTS;
  }, [db]);

  const [date, setDate] = useState(tx.date.slice(0, 10));
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.originalAmount ?? tx.amount));
  const [category, setCategory] = useState(tx.category);
  const [subcategory, setSubcategory] = useState(tx.subcategory ?? "");
  const [bankId, setBankId] = useState(tx.bankId ?? "");
  const [accountId, setAccountId] = useState(tx.accountId ?? "");

  const accountsForBank = useMemo(
    () => (bankId ? accounts.filter((a) => a.bankId === bankId) : accounts),
    [accounts, bankId],
  );

  const save = () => {
    const value = Number(amount);
    if (!date || !description.trim() || !value || !category || !subcategory) return;
    if (!isCanonicalPair(txType, category, subcategory)) {
      window.alert("Categoría no válida. Elige de la taxonomía canónica.");
      return;
    }
    const period = date.slice(0, 7);
    const conceptId = resolveBudgetConceptId(db, period, txType, category, subcategory);

    db.updateTransaction(tx.id, {
      date,
      description: description.trim(),
      amount: value,
      originalAmount: value,
      originalCurrency: tx.originalCurrency ?? "MXN",
      currency: tx.currency ?? "MXN",
      category,
      subcategory,
      budgetConceptId: conceptId,
      bankId: bankId || undefined,
      accountId: accountId || undefined,
      linkReviewStatus: conceptId ? "confirmed" : "pending",
      source: tx.source === "shopping_trip" ? "shopping_trip" : "manual",
    });
    refresh();
    onClose();
  };

  const remove = () => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    db.deleteTransaction(tx.id);
    refresh();
    onClose();
  };

  return (
    <ModalShell open onClose={onClose} title="Editar movimiento" className="space-y-4">
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
      <CategorySubcategoryPicker
        type={txType}
        category={category}
        subcategory={subcategory}
        onCategoryChange={setCategory}
        onSubcategoryChange={setSubcategory}
      />
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
            disabled={!date || !description.trim() || !Number(amount) || !category || !subcategory}
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
