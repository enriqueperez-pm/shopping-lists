"use client";

import { money } from "@/lib/money";

type Props = {
  usagePct: number;
  spent: number;
  committed: number;
  income: number;
};

export default function UsageProgressBar({ usagePct, spent, committed, income }: Props) {
  const tone = usagePct >= 90 ? "danger" : usagePct >= 75 ? "warn" : "";

  return (
    <div className="surface-soft p-3 space-y-2">
      <div className="flex justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">{usagePct}% del ingreso usado</span>
        <span className="text-ink-faint tabular-nums">
          {money(spent + committed)} / {money(income)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(21,49,49,0.06)] overflow-hidden">
        <div
          className={`progress-fill ${tone}`}
          style={{ width: `${usagePct}%` }}
        />
      </div>
    </div>
  );
}
