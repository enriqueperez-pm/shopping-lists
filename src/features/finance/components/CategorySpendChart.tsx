"use client";



import { money } from "@/lib/money";

import { getCategoryColor } from "../categoryColors";



type Props = {

  entries: [string, number][];

  periodLabel: string;

  onCategorySelect?: (category: string) => void;

  selectedCategory?: string | null;

};



export default function CategorySpendChart({

  entries,

  periodLabel,

  onCategorySelect,

  selectedCategory,

}: Props) {

  const max = entries[0]?.[1] || 1;



  if (!entries.length) {

    return <p className="text-caption">Sin gastos en movimientos de {periodLabel}.</p>;

  }



  return (

    <div className="space-y-2.5">

      {entries.map(([cat, amt]) => {

        const pct = Math.max(8, Math.round((amt / max) * 100));

        const color = getCategoryColor(cat);

        const isSelected = selectedCategory === cat;

        const Tag = onCategorySelect ? "button" : "div";

        return (

          <Tag

            key={cat}

            type={onCategorySelect ? "button" : undefined}

            onClick={onCategorySelect ? () => onCategorySelect(cat) : undefined}

            className={`flex items-center gap-2 text-xs w-full text-left rounded-lg px-1 py-1 -mx-1 transition-colors ${

              onCategorySelect ? "hover:bg-[rgb(var(--ink-rgb)/0.04)] cursor-pointer" : ""

            } ${isSelected ? "bg-flujo-mint/15 ring-1 ring-pantry/40" : ""}`}

          >

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

          </Tag>

        );

      })}

    </div>

  );

}

