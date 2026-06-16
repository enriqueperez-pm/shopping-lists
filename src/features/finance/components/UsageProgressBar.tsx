"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { money } from "@/lib/money";
import type { PendingPaymentItem } from "../period-math";

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
}

type Props = {
  spentPct: number;
  committedPct: number;
  totalCommittedPct: number;
  spent: number;
  committed: number;
  income: number;
  pendingPayments: PendingPaymentItem[];
  viewingPeriod?: string;
};

export default function UsageProgressBar({
  spentPct,
  committedPct,
  totalCommittedPct,
  spent,
  committed,
  income,
  pendingPayments,
  viewingPeriod,
}: Props) {
  const [open, setOpen] = useState(false);
  const tone = totalCommittedPct >= 90 ? "danger" : totalCommittedPct >= 75 ? "warn" : "";
  const hasPendingDetail = committed > 0 && pendingPayments.length > 0;

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
        {hasPendingDetail ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 hover:text-ink-muted transition-colors"
            aria-expanded={open}
          >
            <span className="w-2 h-2 rounded-full bg-[rgba(180,140,80,0.85)] shrink-0" />
            Por pagar {money(committed)} ({committedPct}%)
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[rgba(180,140,80,0.85)] shrink-0" />
            Por pagar {money(committed)} ({committedPct}%)
          </span>
        )}
      </div>

      {open && hasPendingDetail ? (
        <ul className="border-t border-[var(--border-hairline)] pt-2 space-y-1.5">
          {pendingPayments.map((item) => (
            <li
              key={item.conceptId}
              className="flex justify-between gap-3 text-micro"
            >
              <div className="min-w-0">
                <p className="text-ink truncate">
                  {item.name}
                  {viewingPeriod && item.originPeriod !== viewingPeriod ? (
                    <span className="text-ink-faint font-normal">
                      {" "}
                      · {formatPeriodLabel(item.originPeriod)}
                    </span>
                  ) : null}
                </p>
                <p className="text-ink-faint truncate">
                  {item.subcategory ? `${item.category} · ${item.subcategory}` : item.category}
                  {" · "}
                  {money(item.paid)} de {money(item.budgeted)}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-ink shrink-0">
                {money(item.pending)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
