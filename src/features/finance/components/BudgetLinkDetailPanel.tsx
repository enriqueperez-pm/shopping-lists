"use client";

import { useMemo } from "react";
import { useFinance } from "../FinancialDbProvider";
import type { EnhancedTransaction } from "../FinancialDatabase";
import type { BudgetConcept } from "../types";
import {
  countLinkReviewPending,
  getTransactionsForConcept,
  setTransactionLinkReview,
  type LinkReviewStatus,
} from "../finance-crud";
import { getBudgetConcepts } from "../finance-linking";
import { money } from "@/lib/money";
import SearchableConceptPicker from "./SearchableConceptPicker";

type Props =
  | {
      mode: "concept";
      concept: BudgetConcept;
      transactions: EnhancedTransaction[];
      onChanged?: () => void;
    }
  | {
      mode: "transaction";
      tx: EnhancedTransaction;
      onChanged?: () => void;
    };

function ReviewChips({
  status,
  onPick,
}: {
  status?: LinkReviewStatus;
  onPick: (s: LinkReviewStatus) => void;
}) {
  const chips: { id: LinkReviewStatus; label: string }[] = [
    { id: "pending", label: "Pendiente" },
    { id: "confirmed", label: "Correcto" },
    { id: "incorrect", label: "Incorrecto" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onPick(chip.id)}
          className={
            (status ?? "pending") === chip.id
              ? "chip-active text-xs"
              : "chip text-xs"
          }
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function linkReviewBadge(status?: LinkReviewStatus, hasLink?: boolean) {
  if (!hasLink) return { label: "Sin vínculo", className: "text-ink-faint bg-[rgba(21,49,49,0.04)]" };
  if (status === "confirmed") return { label: "✓", className: "text-pantry bg-[rgba(34,120,90,0.1)]" };
  if (status === "incorrect") return { label: "✗", className: "text-danger bg-[rgba(180,50,50,0.1)]" };
  return { label: "⚠", className: "text-cart bg-[rgba(180,120,40,0.1)]" };
}

export default function BudgetLinkDetailPanel(props: Props) {
  const { db, refresh, selectedPeriod, transactions: allTx } = useFinance();

  if (props.mode === "concept") {
    const { concept, transactions, onChanged } = props;
    const linked = useMemo(
      () => getTransactionsForConcept(transactions, concept.id),
      [transactions, concept.id],
    );
    const pending = countLinkReviewPending(linked);

    return (
      <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[rgba(21,49,49,0.02)] p-3 space-y-2">
        <p className="text-caption text-ink-muted">
          {linked.length} {linked.length === 1 ? "gasto" : "gastos"}
          {pending > 0 ? ` · ${pending} sin revisar` : ""}
        </p>
        {linked.length === 0 ? (
          <p className="text-caption text-ink-faint">Sin movimientos vinculados.</p>
        ) : (
          linked.map((tx) => (
            <div key={tx.id} className="rounded-lg bg-white border border-[var(--border-hairline)] p-2.5 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-micro text-ink-faint">{tx.date}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums shrink-0">−{money(tx.amount)}</p>
              </div>
              <ReviewChips
                status={tx.linkReviewStatus}
                onPick={(status) => {
                  setTransactionLinkReview(db, tx.id, status);
                  refresh();
                  onChanged?.();
                }}
              />
              {tx.linkReviewStatus === "incorrect" || !tx.linkReviewStatus ? (
                <ConceptReassignPicker
                  tx={tx}
                  onDone={() => {
                    refresh();
                    onChanged?.();
                  }}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    );
  }

  const { tx, onChanged } = props;
  const concepts = useMemo(() => getBudgetConcepts(db), [db]);
  const concept = concepts.find((c) => c.id === tx.budgetConceptId);
  const prefs = db.getUserPreferences();

  if (!concept) {
    return (
      <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[rgba(21,49,49,0.02)] p-3 space-y-2">
        <p className="text-caption text-danger">Sin concepto de presupuesto vinculado.</p>
        <ConceptReassignPicker tx={tx} onDone={() => { refresh(); onChanged?.(); }} />
      </div>
    );
  }

  const linkedTx = getTransactionsForConcept(allTx, concept.id);
  const usagePct =
    concept.budgetedAmount > 0
      ? Math.round((concept.actualAmount / concept.budgetedAmount) * 100)
      : null;

  return (
    <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[rgba(21,49,49,0.02)] p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">{concept.name}</p>
        <p className="text-caption text-ink-faint">
          {concept.category}
          {concept.subcategory ? ` · ${concept.subcategory}` : ""}
        </p>
        <p className="text-caption tabular-nums mt-1">
          Plan {money(concept.budgetedAmount)} · Ejercido {money(concept.actualAmount)}
          {usagePct != null ? ` · ${usagePct}%` : ""}
        </p>
      </div>
      <ReviewChips
        status={tx.linkReviewStatus}
        onPick={(status) => {
          if (status === "incorrect") {
            setTransactionLinkReview(db, tx.id, "incorrect");
            refresh();
            onChanged?.();
            return;
          }
          setTransactionLinkReview(db, tx.id, status);
          refresh();
          onChanged?.();
        }}
      />
      {(tx.linkReviewStatus === "incorrect" || tx.linkReviewStatus === "pending" || !tx.linkReviewStatus) && (
        <ConceptReassignPicker
          tx={tx}
          recentIds={prefs.recentConceptIds}
          onDone={() => {
            refresh();
            onChanged?.();
          }}
        />
      )}
      {linkedTx.length > 1 ? (
        <p className="text-micro text-ink-faint">
          {linkedTx.length} movimientos en este concepto este mes
        </p>
      ) : null}
    </div>
  );
}

function ConceptReassignPicker({
  tx,
  recentIds,
  onDone,
}: {
  tx: EnhancedTransaction;
  recentIds?: string[];
  onDone: () => void;
}) {
  const { db, selectedPeriod } = useFinance();
  const txType = tx.type === "income" ? "income" : "expense";
  const concepts = useMemo(
    () =>
      getBudgetConcepts(db).filter(
        (c) => !c.isParent && c.type === txType && c.period === selectedPeriod,
      ),
    [db, txType, selectedPeriod],
  );

  return (
    <div className="space-y-1">
      <span className="modal-label">Reasignar concepto</span>
      <SearchableConceptPicker
        concepts={concepts}
        value={tx.budgetConceptId ?? ""}
        onChange={(id) => {
          if (!id) return;
          setTransactionLinkReview(db, tx.id, "incorrect", { suggestedConceptId: id });
          onDone();
        }}
        selectedPeriod={selectedPeriod}
        recentIds={recentIds}
        placeholder="Elegir concepto…"
      />
    </div>
  );
}
