"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  stageColor,
  stageIcon,
  stageLabel,
  type CycleContext,
  type ProductStage,
} from "@/lib/productStage";
import type { ShoppingStatus } from "@/lib/types";

const ACTIVE: Record<string, string> = {
  pantry: "text-pantry bg-pantry-light ring-pantry/40",
  list: "text-list bg-slate-100 ring-list/30",
  cart: "text-cart bg-amber-50 ring-cart/40",
  saved: "text-saved bg-saved-bg ring-saved/40",
};

type Stage = ProductStage | ShoppingStatus;

type StateJoystickMenuProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  stages: Stage[];
  highlighted: Stage | null;
  onRegister: (stages: Stage[], elements: (HTMLElement | null)[]) => void;
  onClose: () => void;
};

export default function StateJoystickMenu({
  open,
  anchor,
  stages,
  highlighted,
  onRegister,
  onClose,
}: StateJoystickMenuProps) {
  const optionRefs = useRef<(HTMLElement | null)[]>([]);
  const mounted = typeof document !== "undefined";

  useLayoutEffect(() => {
    if (!open) return;
    onRegister(stages, optionRefs.current);
    requestAnimationFrame(() => onRegister(stages, optionRefs.current));
  }, [open, onRegister, stages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open || !anchor) return null;

  const openLeft = anchor.x > window.innerWidth * 0.55;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] bg-ink/10"
        style={{ touchAction: "none" }}
        aria-hidden
      />
      <div
        role="menu"
        aria-label="Elegir estado"
        className="fixed z-[101] flex flex-col gap-1 p-2 min-w-[10.5rem] rounded-2xl
          bg-[var(--bg-surface)] shadow-xl border border-[rgba(21,49,49,0.12)]
          pointer-events-none select-none"
        style={{
          left: anchor.x,
          top: anchor.y,
          transform: openLeft
            ? "translate(calc(-100% - 10px), -50%)"
            : "translate(10px, -50%)",
        }}
      >
        {stages.map((stage, i) => {
          const Icon = stageIcon(stage);
          const color = stageColor(stage);
          const active = highlighted === stage;
          return (
            <div
              key={stage}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role="menuitem"
              aria-label={stageLabel(stage)}
              aria-current={active ? "true" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                transition-all ring-2 ring-transparent
                ${active ? ACTIVE[color] : "text-ink-faint opacity-70"}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} fill="none" aria-hidden />
              <span className={`text-sm font-medium ${active ? "" : "text-ink-muted"}`}>
                {stageLabel(stage)}
              </span>
            </div>
          );
        })}
      </div>
    </>,
    document.body,
  );
}
