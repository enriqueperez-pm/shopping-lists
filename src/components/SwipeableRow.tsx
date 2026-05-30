"use client";

import { useRef, useState, useCallback } from "react";
import { ArrowRightLeft, Trash2 } from "lucide-react";

const THRESHOLD = 80;
const MAX_SWIPE = 100;
const HORIZONTAL_SLOP = 12;

export default function SwipeableRow({
  children,
  onDelete,
  onCycleState,
  deleteLabel = "Eliminar",
  cycleLabel = "Estado",
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onCycleState?: () => void;
  deleteLabel?: string;
  cycleLabel?: string;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const horizontalActive = useRef(false);
  const offsetRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("input, select, textarea, [data-no-swipe]")) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
    horizontalActive.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (!horizontalActive.current) {
        if (Math.abs(dx) < HORIZONTAL_SLOP && Math.abs(dy) < HORIZONTAL_SLOP) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          dragging.current = false;
          return;
        }
        horizontalActive.current = true;
      }

      let next = 0;
      if (dx < 0) {
        next = Math.max(-MAX_SWIPE, dx);
      } else if (dx > 0 && onCycleState) {
        next = Math.min(MAX_SWIPE, dx);
      }
      offsetRef.current = next;
      setOffset(next);
    },
    [onCycleState],
  );

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    horizontalActive.current = false;
    const finalOffset = offsetRef.current;
    if (finalOffset <= -THRESHOLD) {
      onDelete();
    } else if (finalOffset >= THRESHOLD && onCycleState) {
      onCycleState();
    }
    offsetRef.current = 0;
    setOffset(0);
  }, [onDelete, onCycleState]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 px-3 bg-danger-bg"
        style={{ width: MAX_SWIPE }}
        aria-hidden
      >
        <Trash2 size={16} className="text-danger" aria-hidden />
        <span className="text-xs font-semibold text-danger">{deleteLabel}</span>
      </div>
      {onCycleState && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start gap-1.5 px-3 bg-pantry-light"
          style={{ width: MAX_SWIPE }}
          aria-hidden
        >
          <ArrowRightLeft size={16} className="text-pantry" aria-hidden />
          <span className="text-xs font-semibold text-pantry">{cycleLabel}</span>
        </div>
      )}
      <div
        className="relative transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
