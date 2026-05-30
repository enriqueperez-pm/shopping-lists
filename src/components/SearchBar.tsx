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
    <div className="flex items-center gap-2 surface rounded-lg px-3 py-2
      focus-within:border-brand-200 transition-colors">
      <Search size={15} className="text-slate-300 shrink-0" />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-300
          outline-none min-w-0"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => { onChange(""); ref.current?.focus(); }}
          className="text-slate-300 hover:text-slate-500 flex items-center justify-center w-7 h-7"
          aria-label="Limpiar busqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
