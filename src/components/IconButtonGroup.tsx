"use client";

import ActionsSideToggle from "./ActionsSideToggle";
import ItemDensityToggle from "./ItemDensityToggle";
import type { ActionsSide } from "@/lib/useCardLayout";
import type { ItemDensity } from "@/lib/useItemDensity";

export default function IconButtonGroup({
  actionsSide,
  onToggleActionsSide,
  density,
  onToggleDensity,
}: {
  actionsSide: ActionsSide;
  onToggleActionsSide: () => void;
  density: ItemDensity;
  onToggleDensity: () => void;
}) {
  return (
    <div
      className="flex items-center shrink-0 rounded-xl border border-[var(--border-hairline)] bg-white/60 p-0.5"
      role="group"
      aria-label="Preferencias de vista"
    >
      <ItemDensityToggle density={density} onToggle={onToggleDensity} />
      <div className="w-px h-4 bg-[var(--border-hairline)]" aria-hidden />
      <ActionsSideToggle side={actionsSide} onToggle={onToggleActionsSide} />
    </div>
  );
}
