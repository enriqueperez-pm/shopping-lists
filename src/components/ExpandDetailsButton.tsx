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
      className="btn-ghost !p-1 !min-h-0 !min-w-0 shrink-0"
      aria-label={open ? `Ocultar detalles de ${label}` : `Ver detalles de ${label}`}
      aria-expanded={open}
    >
      <ChevronDown
        size={15}
        strokeWidth={2}
        className={`text-ink-faint transition-transform duration-normal ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}
