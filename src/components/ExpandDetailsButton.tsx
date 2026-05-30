"use client";

import { ChevronDown } from "lucide-react";

export default function ExpandDetailsButton({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 p-1 rounded-md text-ink-faint hover:text-ink hover:bg-[rgba(21,49,49,0.06)] transition-colors touch-target"
      aria-label={open ? `Ocultar detalles de ${label}` : `Ver detalles de ${label}`}
      aria-expanded={open}
    >
      <ChevronDown
        size={16}
        className={`transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}
