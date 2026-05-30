"use client";

import { useMemo, useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import MonthSelector from "./MonthSelector";
import ConceptEditor from "./ConceptEditor";
import { getBudgetConcepts, ensureBaselineBudgetTaxonomy } from "./finance-linking";
import { useBudgetAnalytics, persistConcepts } from "./useBudget";
import { money } from "@/lib/money";
import type { BudgetConcept } from "./types";

export default function PresupuestoView() {
  const { db, selectedPeriod, refresh } = useFinance();
  const analytics = useBudgetAnalytics();
  const [editing, setEditing] = useState<BudgetConcept | null>(null);

  const leafRows = useMemo(
    () => analytics.leafAnalyses.filter((a) => a.concept.type === "expense"),
    [analytics.leafAnalyses],
  );

  const copyPreviousMonth = () => {
    const [y, m] = selectedPeriod.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const all = getBudgetConcepts(db);
    const prevLeaves = all.filter((c) => !c.isParent && c.period === prevPeriod && c.type === "expense");
    if (prevLeaves.length === 0) return;
    const now = new Date().toISOString();
    const next = [...all];
    for (const src of prevLeaves) {
      const exists = next.some(
        (c) =>
          c.period === selectedPeriod &&
          !c.isParent &&
          c.category === src.category &&
          (c.subcategory || "") === (src.subcategory || ""),
      );
      if (exists) continue;
      next.push({
        ...src,
        id: `concept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        period: selectedPeriod,
        actualAmount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    persistConcepts(db, next);
    ensureBaselineBudgetTaxonomy(db, selectedPeriod);
    refresh();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 pb-8"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-title">Presupuesto</h1>
          <p className="text-caption">Conceptos del mes (MXN)</p>
        </div>
        <button type="button" className="btn-soft shrink-0" onClick={copyPreviousMonth}>
          Copiar mes anterior
        </button>
      </div>

      <MonthSelector />

      <div className="space-y-2">
        {leafRows.length === 0 ? (
          <p className="text-caption">Sin conceptos. Usa copiar mes anterior o edita uno.</p>
        ) : (
          leafRows.map((row) => {
            const pct = row.budgeted > 0 ? Math.min(100, (row.actual / row.budgeted) * 100) : 0;
            const tone = pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-cart" : "bg-pantry";
            return (
              <button
                key={row.concept.id}
                type="button"
                onClick={() => setEditing(row.concept)}
                className="w-full text-left surface-soft p-3 hover:bg-brand-50/20 transition-colors"
              >
                <div className="flex justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{row.concept.name}</p>
                    <p className="text-micro text-ink-faint truncate">
                      {row.concept.category}
                      {row.concept.subcategory ? ` · ${row.concept.subcategory}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums shrink-0">
                    {money(row.actual)} / {money(row.budgeted)}
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border-hairline)] overflow-hidden">
                  <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {editing && (
        <ConceptEditor
          concept={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
