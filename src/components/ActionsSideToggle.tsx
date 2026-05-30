"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import type { ActionsSide } from "@/lib/useCardLayout";

export default function ActionsSideToggle({
  side,
  onToggle,
}: {
  side: ActionsSide;
  onToggle: () => void;
}) {
  const nextSide = side === "right" ? "izquierda" : "derecha";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-[rgba(21,49,49,0.06)] transition-colors"
      aria-label={`Mover botones a la ${nextSide}`}
      title={`Botones a la ${nextSide}`}
    >
      {side === "right" ? <PanelLeft size={16} /> : <PanelRight size={16} />}
    </button>
  );
}
