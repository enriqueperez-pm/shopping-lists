"use client";

type Filter = "all" | "pantry" | "needed" | "in_cart" | "purchased";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pantry", label: "Despensa" },
  { key: "needed", label: "Por comprar" },
  { key: "in_cart", label: "Carrito" },
  { key: "purchased", label: "Comprado" },
];

export default function FilterChips({
  active,
  onChange,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Filtrar">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="radio"
          aria-checked={active === key}
          onClick={() => onChange(key)}
          className={`shrink-0 px-3 py-1.5 rounded-md text-[.72rem] font-medium
            transition-all whitespace-nowrap
            ${active === key
              ? "bg-brand-50 text-brand-700 font-semibold"
              : "text-ink-muted hover:text-ink"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
