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
    <section className="hero-gradient rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/85">Disponible</p>
          <p className="text-[2rem] font-extrabold tabular-nums leading-tight mt-0.5">
            {money(disponible)}
          </p>
          <p className="text-xs text-white/75 mt-1">
            {manualOverride != null ? (
              <>
                Calculado {money(calculated)} · Ajustado manualmente
              </>
            ) : (
              "Ingresos − gastado − por pagar"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdjust}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          Ajustar
        </button>
      </div>
    </section>
  );
}
