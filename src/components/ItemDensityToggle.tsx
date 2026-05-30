"use client";

import { AlignJustify, LayoutList } from "lucide-react";
import type { ItemDensity } from "@/lib/useItemDensity";

export default function ItemDensityToggle({
  density,
  onToggle,
}: {
  density: ItemDensity;
  onToggle: () => void;
}) {
  const isCompact = density === "compact";
  const nextLabel = isCompact ? "Vista amplia" : "Vista compacta";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-[rgba(21,49,49,0.06)] transition-colors"
      aria-label={nextLabel}
      aria-pressed={isCompact}
      title={nextLabel}
    >
      {isCompact ? <LayoutList size={16} /> : <AlignJustify size={16} />}
    </button>
  );
}
