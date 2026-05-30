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
    <div
      className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5 pb-0.5"
      role="radiogroup"
      aria-label="Filtrar"
    >
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          role="radio"
          aria-checked={active === key}
          onClick={() => onChange(key)}
          className={active === key ? "chip-active" : "chip"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
