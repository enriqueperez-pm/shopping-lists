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
      className="btn-ghost !p-1.5"
      aria-label={`Mover botones a la ${nextSide}`}
      title={`Botones a la ${nextSide}`}
    >
      {side === "right" ? <PanelLeft size={15} /> : <PanelRight size={15} />}
    </button>
  );
}
