"use client";

import { useCallback, useMemo, useState, Fragment } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EnhancedTransaction } from "../FinancialDatabase";
import { useFinance } from "../FinancialDbProvider";
import { getBudgetConcepts, resolveBudgetConceptId } from "../finance-linking";
import { MASTER_ACCOUNTS } from "../account-balance";
import { roundMoney, resolveAmountMxn } from "../period-math";
import { isCanonicalPair, getCanonicalCategories, getCanonicalSubcategories } from "../taxonomy-canonical";
import { money } from "@/lib/money";
import MovementTableCell from "./MovementTableCell";
import MovementsTableFooter from "./MovementsTableFooter";
import {
  computeMovementAggregates,
  groupMovementsByCategory,
  linkStatusLabel,
  sortMovements,
  sourceLabel,
  type MovementSortKey,
  type MovementTableField,
  type SortDir,
} from "./movements-table-utils";

type Props = {
  rows: EnhancedTransaction[];
  selectedIds: Set<string>;
  onToggleSelect: (tx: EnhancedTransaction) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  groupByCategory: boolean;
  categoryFilterActive?: boolean;
};

type EditingCell = { txId: string; field: MovementTableField } | null;

const SORT_COLUMNS: { key: MovementSortKey; label: string }[] = [
  { key: "date", label: "Fecha" },
  { key: "description", label: "Descripción" },
  { key: "amount", label: "Monto" },
  { key: "category", label: "Categoría" },
];

export default function MovementsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  groupByCategory,
  categoryFilterActive,
}: Props) {
  const { db, refresh } = useFinance();
  const [sortKey, setSortKey] = useState<MovementSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingCell, setEditingCell] = useState<EditingCell>(null);

  const conceptsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of getBudgetConcepts(db)) {
      if (!c.isParent) map.set(c.id, c.name);
    }
    return map;
  }, [db, rows]);

  const accounts = useMemo(() => {
    const fromDb = db.getAccounts();
    return fromDb.length > 0 ? fromDb : MASTER_ACCOUNTS;
  }, [db]);

  const sortedRows = useMemo(
    () => sortMovements(rows, sortKey, sortDir),
    [rows, sortKey, sortDir],
  );

  const grouped = useMemo(
    () => (groupByCategory ? groupMovementsByCategory(sortedRows) : null),
    [groupByCategory, sortedRows],
  );

  const toggleSort = (key: MovementSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const saveField = useCallback(
    (tx: EnhancedTransaction, field: MovementTableField, rawValue: string) => {
      setEditingCell(null);
      const txType = tx.type === "income" ? "income" : "expense";

      if (field === "date") {
        if (!rawValue || rawValue === tx.date.slice(0, 10)) return;
        db.updateTransaction(tx.id, { date: rawValue });
        refresh();
        return;
      }

      if (field === "type") {
        const next = rawValue === "income" ? "income" : "expense";
        if (next === tx.type) return;
        db.updateTransaction(tx.id, { type: next });
        refresh();
        return;
      }

      if (field === "description") {
        const desc = rawValue.trim();
        if (!desc || desc === tx.description) return;
        db.updateTransaction(tx.id, { description: desc });
        refresh();
        return;
      }

      if (field === "amount") {
        const value = roundMoney(Number(rawValue));
        if (!value || value === resolveAmountMxn(tx)) return;
        db.updateTransaction(tx.id, {
          amount: value,
          originalAmount: value,
          originalCurrency: tx.originalCurrency ?? "MXN",
          currency: tx.currency ?? "MXN",
        });
        refresh();
        return;
      }

      if (field === "category" || field === "subcategory") {
        let category = field === "category" ? rawValue : tx.category;
        let subcategory = field === "subcategory" ? rawValue : tx.subcategory ?? "";
        if (field === "category" && category !== tx.category) {
          const subs = getCanonicalSubcategories(txType, category);
          subcategory = subs.includes(subcategory) ? subcategory : subs[0] ?? "";
        }
        if (!category || !subcategory) return;
        if (!isCanonicalPair(txType, category, subcategory)) {
          window.alert("Par categoría/subcategoría no válido en taxonomía canónica.");
          return;
        }
        const period = tx.date.slice(0, 7);
        const conceptId = resolveBudgetConceptId(db, period, txType, category, subcategory);
        db.updateTransaction(tx.id, {
          category,
          subcategory,
          budgetConceptId: conceptId,
          linkReviewStatus: conceptId ? "confirmed" : "pending",
        });
        refresh();
        return;
      }

      if (field === "accountId") {
        const accountId = rawValue || undefined;
        if (accountId === tx.accountId) return;
        db.updateTransaction(tx.id, { accountId });
        refresh();
        return;
      }

      if (field === "linkReviewStatus") {
        const status = rawValue as EnhancedTransaction["linkReviewStatus"];
        if (!status || status === tx.linkReviewStatus) return;
        db.updateTransaction(tx.id, { linkReviewStatus: status });
        refresh();
        return;
      }

      if (field === "notes") {
        const notes = rawValue.trim();
        if (notes === (tx.notes ?? "")) return;
        db.updateTransaction(tx.id, { notes: notes || undefined });
        refresh();
      }
    },
    [db, refresh],
  );

  const renderRow = (tx: EnhancedTransaction) => {
    const txType = tx.type === "income" ? "income" : "expense";
    const amount = resolveAmountMxn(tx);
    const conceptName = tx.budgetConceptId ? conceptsById.get(tx.budgetConceptId) : undefined;
    const accountName = accounts.find((a) => a.id === tx.accountId)?.name ?? "—";
    const isIncome = tx.type === "income";
    const isEditing = (field: MovementTableField) =>
      editingCell?.txId === tx.id && editingCell.field === field;

    const categoryOptions = getCanonicalCategories(txType).map((c) => ({ value: c, label: c }));
    const subcategoryOptions = getCanonicalSubcategories(txType, tx.category).map((s) => ({
      value: s,
      label: s,
    }));
    const accountOptions = [
      { value: "", label: "Sin cuenta" },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ];
    const linkOptions = [
      { value: "pending", label: "Pendiente" },
      { value: "confirmed", label: "OK" },
      { value: "incorrect", label: "Incorrecto" },
    ];
    const typeOptions = [
      { value: "expense", label: "Gasto" },
      { value: "income", label: "Ingreso" },
    ];

    return (
      <tr
        key={tx.id}
        className={`border-b border-[var(--border-hairline)] hover:bg-[rgb(var(--ink-rgb)/0.02)] ${
          selectedIds.has(tx.id) ? "bg-[rgba(34,120,90,0.06)]" : ""
        }`}
      >
        <td className="px-2 py-2 w-8 sticky left-0 z-[1] bg-inherit">
          <input
            type="checkbox"
            checked={selectedIds.has(tx.id)}
            onChange={() => onToggleSelect(tx)}
            className="h-3.5 w-3.5 rounded accent-[var(--flujo-mint)]"
            aria-label={`Seleccionar ${tx.description}`}
          />
        </td>
        <MovementTableCell
          className="sticky left-8 z-[1] bg-inherit min-w-[6.5rem]"
          display={tx.date.slice(0, 10)}
          isEditing={isEditing("date")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "date" })}
          onCommit={(v) => saveField(tx, "date", v)}
          onCancel={() => setEditingCell(null)}
          inputType="date"
          editValue={tx.date.slice(0, 10)}
        />
        <MovementTableCell
          display={
            <span className={isIncome ? "text-pantry font-medium" : "text-danger font-medium"}>
              {isIncome ? "Ingreso" : "Gasto"}
            </span>
          }
          isEditing={isEditing("type")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "type" })}
          onCommit={(v) => saveField(tx, "type", v)}
          onCancel={() => setEditingCell(null)}
          inputType="select"
          editValue={tx.type === "income" ? "income" : "expense"}
          options={typeOptions}
        />
        <MovementTableCell
          className="sticky left-[14rem] md:static z-[1] bg-inherit min-w-[10rem] max-w-[14rem]"
          display={<span className="truncate block max-w-[14rem]">{tx.description}</span>}
          isEditing={isEditing("description")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "description" })}
          onCommit={(v) => saveField(tx, "description", v)}
          onCancel={() => setEditingCell(null)}
          editValue={tx.description}
        />
        <MovementTableCell
          className="sticky left-[24rem] md:static md:min-w-[5.5rem] z-[1] bg-inherit"
          align="right"
          display={
            <span className={`font-semibold tabular-nums ${isIncome ? "text-pantry" : "text-danger"}`}>
              {isIncome ? "+" : "−"}
              {money(amount)}
            </span>
          }
          isEditing={isEditing("amount")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "amount" })}
          onCommit={(v) => saveField(tx, "amount", v)}
          onCancel={() => setEditingCell(null)}
          inputType="number"
          editValue={String(tx.originalAmount ?? tx.amount)}
        />
        <MovementTableCell
          display={tx.category || "—"}
          isEditing={isEditing("category")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "category" })}
          onCommit={(v) => saveField(tx, "category", v)}
          onCancel={() => setEditingCell(null)}
          inputType="select"
          editValue={tx.category}
          options={categoryOptions}
        />
        <MovementTableCell
          display={tx.subcategory || "—"}
          isEditing={isEditing("subcategory")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "subcategory" })}
          onCommit={(v) => saveField(tx, "subcategory", v)}
          onCancel={() => setEditingCell(null)}
          inputType="select"
          editValue={tx.subcategory ?? ""}
          options={subcategoryOptions}
        />
        <MovementTableCell
          display={accountName}
          isEditing={isEditing("accountId")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "accountId" })}
          onCommit={(v) => saveField(tx, "accountId", v)}
          onCancel={() => setEditingCell(null)}
          inputType="select"
          editValue={tx.accountId ?? ""}
          options={accountOptions}
        />
        <MovementTableCell
          editable={false}
          display={
            <span className="inline-flex px-1.5 py-0.5 rounded text-[0.625rem] bg-[rgb(var(--ink-rgb)/0.06)]">
              {sourceLabel(tx.source)}
            </span>
          }
          isEditing={false}
          onStartEdit={() => {}}
          onCommit={() => {}}
          onCancel={() => {}}
        />
        <MovementTableCell
          editable={false}
          display={
            <span className="truncate block max-w-[8rem]" title={conceptName}>
              {conceptName ?? "—"}
            </span>
          }
          isEditing={false}
          onStartEdit={() => {}}
          onCommit={() => {}}
          onCancel={() => {}}
        />
        <MovementTableCell
          display={linkStatusLabel(tx.linkReviewStatus)}
          isEditing={isEditing("linkReviewStatus")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "linkReviewStatus" })}
          onCommit={(v) => saveField(tx, "linkReviewStatus", v)}
          onCancel={() => setEditingCell(null)}
          inputType="select"
          editValue={tx.linkReviewStatus ?? "pending"}
          options={linkOptions}
        />
        <MovementTableCell
          display={
            <span className="truncate block max-w-[8rem]" title={tx.notes}>
              {tx.notes || "—"}
            </span>
          }
          isEditing={isEditing("notes")}
          onStartEdit={() => setEditingCell({ txId: tx.id, field: "notes" })}
          onCommit={(v) => saveField(tx, "notes", v)}
          onCancel={() => setEditingCell(null)}
          editValue={tx.notes ?? ""}
        />
        <MovementTableCell
          editable={false}
          display={tx.date.slice(0, 7)}
          isEditing={false}
          onStartEdit={() => {}}
          onCommit={() => {}}
          onCancel={() => {}}
          className="text-ink-faint"
        />
      </tr>
    );
  };

  const SortIcon = ({ col }: { col: MovementSortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="finance-table-shell">
      <div className="finance-table-scroll">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-[rgb(var(--ink-rgb)/0.04)] border-b border-[var(--border-hairline)]">
            <tr className="text-[0.625rem] uppercase tracking-wide text-ink-faint">
              <th className="px-2 py-2 w-8 sticky left-0 z-[21] bg-[rgb(var(--ink-rgb)/0.04)]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-3.5 w-3.5 rounded accent-[var(--flujo-mint)]"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th
                className="px-2 py-2 font-semibold cursor-pointer hover:text-ink select-none text-left sticky left-8 z-[21] bg-[rgb(var(--ink-rgb)/0.04)] min-w-[6.5rem]"
                onClick={() => toggleSort("date")}
              >
                <span className="inline-flex items-center gap-0.5">
                  Fecha
                  <SortIcon col="date" />
                </span>
              </th>
              <th className="px-2 py-2 text-left font-semibold min-w-[4.5rem]">Tipo</th>
              {SORT_COLUMNS.filter((c) => c.key !== "date").map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 font-semibold cursor-pointer hover:text-ink select-none ${
                    col.key === "amount" ? "text-right" : "text-left"
                  } ${col.key === "description"
                      ? "sticky left-[14rem] md:static md:min-w-[10rem] z-[21] bg-[rgb(var(--ink-rgb)/0.04)]"
                      : col.key === "amount"
                        ? "sticky left-[24rem] md:static z-[21] bg-[rgb(var(--ink-rgb)/0.04)] min-w-[5.5rem]"
                        : ""
                  }`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              <th className="px-2 py-2 text-left font-semibold min-w-[6rem]">Subcat.</th>
              <th className="px-2 py-2 text-left font-semibold min-w-[6rem]">Cuenta</th>
              <th className="px-2 py-2 text-left font-semibold">Fuente</th>
              <th className="px-2 py-2 text-left font-semibold min-w-[7rem]">Presupuesto</th>
              <th className="px-2 py-2 text-left font-semibold">Vínculo</th>
              <th className="px-2 py-2 text-left font-semibold min-w-[6rem]">Notas</th>
              <th className="px-2 py-2 text-left font-semibold">Periodo</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-caption text-ink-faint">
                  Sin movimientos con este filtro.
                </td>
              </tr>
            ) : grouped ? (
              grouped.map((group) => (
                <Fragment key={`group-${group.category}`}>
                  <tr className="bg-[rgb(var(--ink-rgb)/0.03)]">
                    <td colSpan={10} className="px-2 py-1.5 text-xs font-bold text-ink">
                      {group.category}
                    </td>
                    <td colSpan={4} className="px-2 py-1.5 text-xs font-semibold text-right tabular-nums text-ink-muted">
                      Σ −{money(group.subtotal.expenseTotal)} · +{money(group.subtotal.incomeTotal)}
                    </td>
                  </tr>
                  {group.rows.map(renderRow)}
                </Fragment>
              ))
            ) : (
              sortedRows.map(renderRow)
            )}
          </tbody>
          {sortedRows.length > 0 ? (
            <MovementsTableFooter rows={sortedRows} categoryFilterActive={categoryFilterActive} />
          ) : null}
        </table>
      </div>
      {sortedRows.length > 0 ? (
        <div className="px-3 py-2 border-t border-[var(--border-hairline)] text-micro text-ink-faint flex flex-wrap gap-x-4 gap-y-1">
          {(() => {
            const agg = computeMovementAggregates(sortedRows);
            return (
              <>
                <span>{agg.count} filas</span>
                <span>Gastos −{money(agg.expenseTotal)}</span>
                <span>Ingresos +{money(agg.incomeTotal)}</span>
                <span>Neto {agg.net >= 0 ? "+" : "−"}
                  {money(Math.abs(agg.net))}</span>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
