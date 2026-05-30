"use client";

import { useMemo } from "react";
import { Pencil } from "lucide-react";
import EditField from "@/components/EditField";
import { clampPercent, money } from "@/lib/money";
import { DEFAULT_TRIP_BUDGET } from "@/lib/useTripBudget";

type TripTotalBarProps = {
  tripTotal: number;
  totalNeeded: number;
  totalInCart: number;
  totalPurchased: number;
  budget: number | null;
  onBudgetChange: (amount: number | null) => void;
};

function budgetTone(ratio: number) {
  if (ratio >= 1) return "danger";
  if (ratio >= 0.85) return "cart";
  return "pantry";
}

const toneBarClass = {
  pantry: "bg-pantry",
  cart: "bg-cart",
  danger: "bg-danger",
} as const;

const toneTextClass = {
  pantry: "text-pantry",
  cart: "text-cart",
  danger: "text-danger",
} as const;

export default function TripTotalBar({
  tripTotal,
  totalNeeded,
  totalInCart,
  totalPurchased,
  budget,
  onBudgetChange,
}: TripTotalBarProps) {
  const hasBudget = budget !== null && budget > 0;
  const listEstimate = tripTotal + totalNeeded;
  const ratio = hasBudget ? tripTotal / budget! : 0;
  const tone = hasBudget ? budgetTone(ratio) : "pantry";
  const progress = hasBudget ? clampPercent(ratio * 100) : 0;
  const remaining = hasBudget ? budget! - tripTotal : 0;
  const overBy = hasBudget && remaining < 0 ? Math.abs(remaining) : 0;

  const budgetHint = useMemo(() => {
    if (!hasBudget) return "Toca para fijar tope";
    if (overBy > 0) return `${money(overBy)} sobre tope`;
    return `${money(remaining)} restante`;
  }, [hasBudget, overBy, remaining]);

  return (
    <div
      className="fixed inset-x-0 glass border-t border-[var(--border-hairline)] z-30
        px-[var(--pad,1rem)] py-3 gap-3"
      style={{
        bottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px))",
        "--pad": "clamp(14px, 3.5vw, 22px)",
      } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-micro uppercase tracking-wider text-ink-faint">Visita</p>
          <p
            className={`text-lg font-bold tabular-nums tracking-tight ${
              overBy > 0 ? "text-danger" : "text-brand-600"
            }`}
          >
            {money(tripTotal)}
          </p>

          {hasBudget && (
            <div className="mt-2 space-y-1.5">
              <div
                className="h-1.5 rounded-full bg-[var(--border-hairline)] overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Uso del presupuesto de visita"
              >
                <div
                  className={`h-full rounded-full transition-all duration-normal ${toneBarClass[tone]}`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-micro text-ink-faint shrink-0">Tope</span>
                <EditField
                  value={budget ?? 0}
                  type="number"
                  prefix="$"
                  format={(v) => money(v).slice(1)}
                  parse={(s) => {
                    const n = Number(s.replace(/,/g, ""));
                    return Number.isFinite(n) && n > 0 ? n : null;
                  }}
                  onCommit={(v) => onBudgetChange(typeof v === "number" ? v : null)}
                  displayClassName={`text-micro font-medium tabular-nums ${toneTextClass[tone]} truncate`}
                  inputClassName="text-micro w-24"
                  ariaLabel="Presupuesto de visita"
                />
                <Pencil size={11} className="text-ink-faint/70 shrink-0" aria-hidden />
                <span className={`text-micro tabular-nums truncate ${overBy > 0 ? "text-danger" : "text-ink-faint"}`}>
                  · {budgetHint}
                </span>
                <button
                  type="button"
                  onClick={() => onBudgetChange(null)}
                  className="text-micro text-ink-faint/70 hover:text-ink-faint shrink-0 ml-auto"
                  aria-label="Quitar tope de visita"
                >
                  Quitar
                </button>
              </div>
            </div>
          )}

          {!hasBudget && (
            <button
              type="button"
              onClick={() => onBudgetChange(DEFAULT_TRIP_BUDGET)}
              className="mt-1 text-micro text-pantry font-medium"
            >
              + Fijar tope de visita
            </button>
          )}
        </div>

        <div className="text-right text-caption tabular-nums space-y-0.5 text-ink-faint shrink-0">
          <p>Comprado {money(totalPurchased)}</p>
          <p>Carrito {money(totalInCart)}</p>
          <p>Pendiente {money(totalNeeded)}</p>
          {totalNeeded > 0 && (
            <p className="pt-0.5 text-micro text-ink-faint/80">
              Est. lista {money(listEstimate)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
