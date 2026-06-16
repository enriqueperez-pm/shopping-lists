"use client";

import IconButtonGroup from "./IconButtonGroup";
import PageHeader from "@/components/ui/PageHeader";
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
    <div
      className="shrink-0 px-[var(--pad,1rem)] pt-3 pb-2"
      style={
        {
          "--pad": "clamp(14px, 3.5vw, 22px)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        } as React.CSSProperties
      }
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          hasControls ? (
            <IconButtonGroup
              actionsSide={actionsSide}
              onToggleActionsSide={onToggleActionsSide}
              density={density}
              onToggleDensity={onToggleDensity}
            />
          ) : undefined
        }
      />
    </div>
  );
}
