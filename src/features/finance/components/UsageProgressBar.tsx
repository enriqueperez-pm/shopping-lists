"use client";

import { money } from "@/lib/money";

type Props = {
  spentPct: number;
  committedPct: number;
  totalCommittedPct: number;
  spent: number;
  committed: number;
  income: number;
};

export default function UsageProgressBar({
  spentPct,
  committedPct,
  totalCommittedPct,
  spent,
  committed,
  income,
}: Props) {
  const tone = totalCommittedPct >= 90 ? "danger" : totalCommittedPct >= 75 ? "warn" : "";

  return (
    <div className="surface-soft p-3 space-y-2">
      <div className="flex justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">
          {totalCommittedPct}% del ingreso comprometido
        </span>
        <span className="text-ink-faint tabular-nums">
          {money(spent + committed)} / {money(income)}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-[rgba(21,49,49,0.06)] overflow-hidden flex">
        {spentPct > 0 ? (
          <div
            className="h-full bg-pantry shrink-0"
            style={{ width: `${spentPct}%` }}
            title={`Gastado: ${money(spent)}`}
          />
        ) : null}
        {committedPct > 0 ? (
          <div
            className={`h-full shrink-0 ${tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-cart" : "bg-[rgba(180,140,80,0.85)]"}`}
            style={{ width: `${committedPct}%` }}
            title={`Por pagar: ${money(committed)}`}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-micro text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pantry shrink-0" />
          Gastado {money(spent)} ({spentPct}%)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[rgba(180,140,80,0.85)] shrink-0" />
          Por pagar {money(committed)} ({committedPct}%)
        </span>
      </div>
    </div>
  );
}
