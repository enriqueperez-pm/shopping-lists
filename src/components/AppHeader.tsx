"use client";

import IconButtonGroup from "./IconButtonGroup";
import type { ActionsSide } from "@/lib/useCardLayout";
import type { ItemDensity } from "@/lib/useItemDensity";

export default function AppHeader({
  title,
  subtitle,
  actionsSide,
  onToggleActionsSide,
  density,
  onToggleDensity,
  showControls = true,
}: {
  title: string;
  subtitle?: string;
  actionsSide?: ActionsSide;
  onToggleActionsSide?: () => void;
  density?: ItemDensity;
  onToggleDensity?: () => void;
  showControls?: boolean;
}) {
  const hasControls =
    showControls &&
    actionsSide &&
    onToggleActionsSide &&
    density &&
    onToggleDensity;

  return (
    <header
      className="shrink-0 glass border-b border-[var(--border-hairline)] px-[var(--pad,1rem)] py-3.5"
      style={{ paddingTop: "max(.65rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-title text-lg font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-caption tabular-nums mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {hasControls && (
          <IconButtonGroup
            actionsSide={actionsSide}
            onToggleActionsSide={onToggleActionsSide}
            density={density}
            onToggleDensity={onToggleDensity}
          />
        )}
      </div>
    </header>
  );
}
