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
      className="btn-ghost !p-1.5"
      aria-label={nextLabel}
      aria-pressed={isCompact}
      title={nextLabel}
    >
      {isCompact ? <LayoutList size={15} /> : <AlignJustify size={15} />}
    </button>
  );
}
