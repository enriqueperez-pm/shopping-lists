"use client";

import { useRef } from "react";
import StateJoystickMenu from "./StateJoystickMenu";
import { useLongPressJoystick } from "@/hooks/useLongPressJoystick";
import {
  cycleAriaLabel,
  stageColor,
  stageIcon,
  stagesForContext,
  type CycleContext,
  type ProductStage,
} from "@/lib/productStage";
import type { ShoppingStatus } from "@/lib/types";

type Stage = ProductStage | ShoppingStatus;

const ACTIVE: Record<string, string> = {
  pantry: "text-pantry",
  list: "text-list",
  cart: "text-cart",
  saved: "text-saved",
};

export default function StateCycleButton({
  stage,
  context,
  onCycle,
  onSelectState,
}: {
  stage: Stage;
  context: CycleContext;
  onCycle: () => void;
  onSelectState: (target: Stage) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const stages = stagesForContext(context);
  const Icon = stageIcon(stage);
  const color = stageColor(stage);
  const label = cycleAriaLabel(stage, context);

  const {
    menuOpen,
    anchor,
    highlighted,
    setHighlighted,
    registerOptions,
    closeMenu,
    openFromKeyboard,
    handlers,
  } = useLongPressJoystick<Stage>({
    onTap: onCycle,
    onSelect: onSelectState,
    getAnchorElement: () => btnRef.current,
  });

  return (
    <div data-no-swipe className={menuOpen ? "touch-none" : undefined}>
      <button
        ref={btnRef}
        type="button"
        {...handlers}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            openFromKeyboard(btnRef.current);
            return;
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCycle();
          }
        }}
        className="p-1 touch-target flex items-center justify-center rounded-lg
          transition-transform active:scale-95 motion-reduce:transition-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pantry/40
          focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
      >
        <Icon
          size={22}
          strokeWidth={2.5}
          fill="none"
          className={ACTIVE[color === "saved" ? "saved" : color]}
          aria-hidden
        />
      </button>

      <StateJoystickMenu
        open={menuOpen}
        anchor={anchor}
        stages={stages}
        highlighted={highlighted}
        onRegister={registerOptions}
        onClose={closeMenu}
      />
    </div>
  );
}
