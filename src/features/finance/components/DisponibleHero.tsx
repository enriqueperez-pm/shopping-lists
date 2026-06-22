"use client";

import { money } from "@/lib/money";

type Props = {
  disponible: number;
  calculated: number;
  manualOverride: number | null;
  onAdjust: () => void;
};

export default function DisponibleHero({
  disponible,
  calculated,
  manualOverride,
  onAdjust,
}: Props) {
  return (
    <section className="hero-gradient rounded-3xl p-5 lg:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink/80">Disponible</p>
          <p className="text-[2rem] lg:text-[2.25rem] font-extrabold tabular-nums leading-tight mt-0.5 text-ink">
            {money(disponible)}
          </p>
          <p className="text-xs text-ink/70 mt-1 font-body">
            {manualOverride != null ? (
              <>Calculado {money(calculated)} · Ajustado manualmente</>
            ) : (
              "Ingresos − gastado − por pagar"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdjust}
          className="shrink-0 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-ink/10 text-ink hover:bg-ink/15 transition-colors"
        >
          Ajustar
        </button>
      </div>
    </section>
  );
}
