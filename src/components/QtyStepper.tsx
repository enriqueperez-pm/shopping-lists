"use client";

import { Minus, Plus } from "lucide-react";

export default function QtyStepper({
  value,
  onChange,
  min = 0.25,
  step = 1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1"
      role="group" aria-label={label || "Cantidad"}>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className="w-10 h-10 rounded-lg flex items-center justify-center
          bg-slate-50 text-slate-700 font-bold transition hover:bg-slate-100
          active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-target"
        aria-label="Menos"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-[2.2rem] text-center font-bold text-sm tabular-nums select-none">
        {Number.isInteger(value) ? value : value.toFixed(2)}
      </span>
      <button
        onClick={() => onChange(Math.min(99, value + step))}
        disabled={value >= 99}
        className="w-10 h-10 rounded-lg flex items-center justify-center
          bg-slate-50 text-slate-700 font-bold transition hover:bg-slate-100
          active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-target"
        aria-label="Mas"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
