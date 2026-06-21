"use client";

import { Minus, Plus } from "lucide-react";
import EditField from "./EditField";
import { clampQty, clampQtyInt, formatQty, QTY_MIN, QTY_MAX, QTY_STEP } from "@/lib/qty";

export default function QtyStepper({
  value,
  onChange,
  min = QTY_MIN,
  step = QTY_STEP,
  label,
  compact = false,
  integer = false,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  label?: string;
  compact?: boolean;
  integer?: boolean;
}) {
  const btn = compact ? "w-8 h-8" : "w-9 h-9";
  const icon = compact ? 13 : 15;
  const resolvedStep = integer ? 1 : step;
  const clamp = integer ? clampQtyInt : clampQty;
  const resolvedMin = integer ? 1 : min;

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg ${
        compact ? "" : "bg-white border border-[var(--border-hairline)] p-0.5"
      }`}
      role="group"
      aria-label={label || "Cantidad"}
      data-no-swipe
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - resolvedStep))}
        disabled={value <= resolvedMin}
        className={`${btn} rounded-md flex items-center justify-center
          text-ink-faint transition-colors duration-fast hover:text-ink hover:bg-[rgb(var(--ink-rgb) / 0.04)]
          active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Menos"
      >
        <Minus size={icon} />
      </button>
      <EditField
        value={value}
        type="number"
        format={formatQty}
        parse={(s) => clamp(Number(s) || resolvedMin)}
        onCommit={(qty) => onChange(qty as number)}
        ariaLabel="Cantidad"
        displayClassName="min-w-[2rem] justify-center tabular-nums px-1 edit-display-compact !min-h-[32px]"
        inputClassName="w-14 text-center"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + resolvedStep))}
        disabled={value >= QTY_MAX}
        className={`${btn} rounded-md flex items-center justify-center
          text-ink-faint transition-colors duration-fast hover:text-ink hover:bg-[rgb(var(--ink-rgb) / 0.04)]
          active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Mas"
      >
        <Plus size={icon} />
      </button>
    </div>
  );
}
