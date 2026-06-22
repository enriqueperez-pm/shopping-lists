"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { BudgetConcept } from "../types";
import {
  formatConceptPickerLabel,
  groupBudgetConceptsByCategoryAndSubcategory,
} from "../finance-linking";

type Props = {
  concepts: BudgetConcept[];
  value: string;
  onChange: (id: string) => void;
  selectedPeriod?: string;
  recentIds?: string[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

function matchesQuery(concept: BudgetConcept, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [concept.name, concept.category, concept.subcategory ?? "", concept.id]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export default function SearchableConceptPicker({
  concepts,
  value,
  onChange,
  selectedPeriod,
  recentIds = [],
  placeholder = "Selecciona concepto",
  allowEmpty = false,
  emptyLabel = "Sin concepto",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = concepts.find((c) => c.id === value);

  const filtered = useMemo(
    () => concepts.filter((c) => matchesQuery(c, query)),
    [concepts, query],
  );

  const groups = useMemo(
    () => groupBudgetConceptsByCategoryAndSubcategory(filtered),
    [filtered],
  );

  const recentConcepts = useMemo(() => {
    const seen = new Set<string>();
    const rows: BudgetConcept[] = [];
    for (const id of recentIds) {
      if (seen.has(id)) continue;
      const concept = concepts.find((c) => c.id === id);
      if (concept && matchesQuery(concept, query)) {
        seen.add(id);
        rows.push(concept);
      }
    }
    return rows.slice(0, 5);
  }, [recentIds, concepts, query]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" data-no-swipe>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="modal-input bg-white w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={selected || (allowEmpty && !value) ? "text-ink truncate" : "text-ink-faint"}>
          {selected
            ? formatConceptPickerLabel(selected, selectedPeriod)
            : allowEmpty && !value
              ? emptyLabel
              : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-white shadow-card max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[var(--border-hairline)] flex items-center gap-2">
            <Search size={14} className="text-ink-faint shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoría, subcategoría o concepto…"
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-ink-faint"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {allowEmpty ? (
              <button
                type="button"
                onClick={() => pick("")}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-[rgb(var(--ink-rgb) / 0.04)] ${
                  !value ? "bg-[rgb(var(--ink-rgb) / 0.06)] font-medium" : ""
                }`}
              >
                {emptyLabel}
              </button>
            ) : null}

            {recentConcepts.length > 0 ? (
              <div className="mb-2">
                <p className="px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-ink-faint">
                  Recientes
                </p>
                {recentConcepts.map((c) => (
                  <button
                    key={`recent-${c.id}`}
                    type="button"
                    onClick={() => pick(c.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-[rgb(var(--ink-rgb) / 0.04)] ${
                      value === c.id ? "bg-[rgb(var(--ink-rgb) / 0.06)] font-medium" : ""
                    }`}
                  >
                    {formatConceptPickerLabel(c, selectedPeriod)}
                  </button>
                ))}
              </div>
            ) : null}

            {groups.length === 0 ? (
              <p className="px-2.5 py-3 text-caption text-ink-faint">Sin resultados</p>
            ) : (
              groups.map(({ category, subcategories }) => (
                <div key={category} className="mb-2">
                  <p className="sticky top-0 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-ink-faint bg-white border-b border-[var(--border-hairline)]">
                    {category}
                  </p>
                  {subcategories.map(({ subcategory, concepts: subConcepts }) => (
                    <div key={`${category}-${subcategory}`} className="mb-1">
                      <p className="px-2.5 py-1 text-[0.625rem] font-semibold text-ink-muted">
                        {subcategory}
                      </p>
                      {subConcepts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pick(c.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-[rgb(var(--ink-rgb) / 0.04)] ${
                            value === c.id ? "bg-[rgb(var(--ink-rgb) / 0.06)] font-medium" : ""
                          }`}
                        >
                          {formatConceptPickerLabel(c, selectedPeriod)}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
