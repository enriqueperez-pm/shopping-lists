"use client";

import { useMemo } from "react";
import { useFinance } from "../FinancialDbProvider";
import { computeAllAccountBalances } from "../account-balance";
import { money } from "@/lib/money";

export default function AccountBalanceStrip() {
  const { transactions, selectedPeriod } = useFinance();
  const rows = useMemo(
    () => computeAllAccountBalances(transactions, selectedPeriod),
    [transactions, selectedPeriod],
  );

  if (rows.length === 0) return null;

  return (
    <div className="surface-soft rounded-xl p-3 space-y-2">
      <p className="text-caption font-semibold text-ink">Saldo por cuenta (mes)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.accountId}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-hairline)] bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{row.name}</p>
              <p className="text-micro text-ink-faint">{row.summary.txCount} movimientos</p>
            </div>
            <p
              className={`text-sm font-semibold tabular-nums shrink-0 ${
                row.summary.net >= 0 ? "text-pantry" : "text-danger"
              }`}
            >
              {row.summary.net >= 0 ? "+" : "−"}
              {money(Math.abs(row.summary.net))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
