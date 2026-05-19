"use client";

type Filter = "all" | "needs" | "stock";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "needs", label: "Falta comprar" },
  { key: "stock", label: "En casa" },
];

export default function FilterChips({
  active,
  onChange,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="radiogroup" aria-label="Filtrar productos">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="radio"
          aria-checked={active === key}
          onClick={() => onChange(key)}
          className={`shrink-0 px-4 py-2.5 rounded-full text-[.8rem] font-semibold
            border-[1.5px] touch-target transition-all whitespace-nowrap
            ${active === key
              ? "bg-brand-50 border-brand-400 text-brand-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
        >
          {key === "needs" && "🛒 "}{key === "stock" && "✓ "}{label}
        </button>
      ))}
    </div>
  );
}
