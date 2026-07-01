"use client";

import type { EnhancedTransaction } from "../FinancialDatabase";
import { money } from "@/lib/money";
import { computeMovementAggregates } from "./movements-table-utils";

type Props = {
  rows: EnhancedTransaction[];
  categoryFilterActive?: boolean;
};

export default function MovementsTableFooter({ rows, categoryFilterActive }: Props) {
  const agg = computeMovementAggregates(rows);

  return (
    <tfoot className="sticky bottom-0 z-10 bg-[var(--bg-cream)] border-t-2 border-[var(--border-hairline)]">
      <tr className="text-xs font-semibold text-ink">
        <td colSpan={4} className="px-2 py-2 text-ink-muted">
          COUNT() {agg.count}
          {categoryFilterActive ? " · filtro categoría activo" : ""}
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-danger" colSpan={1}>
          SUM gastos −{money(agg.expenseTotal)}
        </td>
        <td colSpan={4} className="px-2 py-2 text-right tabular-nums text-pantry">
          SUM ingresos +{money(agg.incomeTotal)}
        </td>
        <td colSpan={5} className="px-2 py-2 text-right tabular-nums">
          NET() {agg.net >= 0 ? "+" : "−"}
          {money(Math.abs(agg.net))}
        </td>
      </tr>
    </tfoot>
  );
}
