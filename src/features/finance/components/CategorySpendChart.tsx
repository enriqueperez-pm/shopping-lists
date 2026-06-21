"use client";

import { money } from "@/lib/money";
import { getCategoryColor } from "../categoryColors";

type Props = {
  entries: [string, number][];
  periodLabel: string;
};

export default function CategorySpendChart({ entries, periodLabel }: Props) {
  const max = entries[0]?.[1] || 1;

  if (!entries.length) {
    return <p className="text-caption">Sin gastos en movimientos de {periodLabel}.</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map(([cat, amt]) => {
        const pct = Math.max(8, Math.round((amt / max) * 100));
        const color = getCategoryColor(cat);
        return (
          <div key={cat} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate font-medium text-ink">{cat}</span>
            <div className="cat-bar-bg">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-ink">
              {money(amt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
