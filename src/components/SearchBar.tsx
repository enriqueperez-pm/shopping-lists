"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar producto...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-slate-200
      rounded-xl px-3.5 py-2.5 shadow-card focus-within:border-brand-400
      focus-within:ring-2 focus-within:ring-brand-100 transition-all">
      <Search size={16} className="text-slate-400 shrink-0" />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400
          outline-none min-w-0"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => { onChange(""); ref.current?.focus(); }}
          className="text-slate-400 hover:text-slate-600 touch-target flex items-center justify-center"
          aria-label="Limpiar busqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
