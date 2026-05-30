"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex items-center gap-2 surface-soft rounded-xl px-3 py-2.5
        focus-within:ring-1 focus-within:ring-pantry/20 transition-shadow duration-fast"
    >
      <Search size={15} className="text-ink-faint/70 shrink-0" strokeWidth={2} />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-faint/60
          outline-none min-w-0"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className="btn-ghost !p-1 !min-h-0 !min-w-0 text-ink-faint"
          aria-label="Limpiar busqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
