"use client";

import type { LucideIcon } from "lucide-react";

type SemanticColor = "pantry" | "list" | "cart" | "saved";

const ACTIVE: Record<SemanticColor, string> = {
  pantry: "text-pantry",
  list: "text-list",
  cart: "text-cart",
  saved: "text-saved",
};

export default function IconToggle({
  icon: Icon,
  active,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  active: boolean;
  label: string;
  color: SemanticColor;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className="p-1 touch-target flex items-center justify-center rounded-lg
        transition-transform active:scale-95 motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pantry/40
        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.75}
        fill="none"
        className={active ? ACTIVE[color] : "text-ink-faint"}
        aria-hidden
      />
    </button>
  );
}
