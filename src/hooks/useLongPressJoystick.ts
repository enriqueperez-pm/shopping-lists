"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const LONG_PRESS_MS = 450;
const MOVE_CANCEL = 12;
const SELECT_RADIUS = 100;
const HIGHLIGHT_SLOP = 8;

export function closestOption<T>(
  clientX: number,
  clientY: number,
  elements: (HTMLElement | null)[],
  options: T[],
): T | null {
  const rects = elements
    .map((el) => el?.getBoundingClientRect() ?? null)
    .filter((r): r is DOMRect => r !== null);
  if (rects.length === 0) return null;
  const menuLeft = Math.min(...rects.map((r) => r.left));
  const menuRight = Math.max(...rects.map((r) => r.right));
  const projectedX = Math.min(menuRight, Math.max(menuLeft, clientX));

  let best: T | null = null;
  let bestDist = Infinity;
  elements.forEach((el, i) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(projectedX - cx, clientY - cy);
    if (d < bestDist) {
      bestDist = d;
      best = options[i];
    }
  });
  return bestDist <= SELECT_RADIUS ? best : null;
}

export function useLongPressJoystick<T>({
  onTap,
  onSelect,
  longPressMs = LONG_PRESS_MS,
  getAnchorElement,
}: {
  onTap: () => void;
  onSelect: (value: T) => void;
  longPressMs?: number;
  getAnchorElement?: () => HTMLElement | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [highlighted, setHighlighted] = useState<T | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<Point | null>(null);
  const menuOpenRef = useRef(false);
  const menuGestureRef = useRef(false);
  const releaseHandledRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const captureElRef = useRef<HTMLElement | null>(null);
  const optionElsRef = useRef<(HTMLElement | null)[]>([]);
  const optionsRef = useRef<T[]>([]);
  const highlightedRef = useRef<T | null>(null);
  const onTapRef = useRef(onTap);
  const onSelectRef = useRef(onSelect);
  const getAnchorElementRef = useRef(getAnchorElement);

  highlightedRef.current = highlighted;
  onTapRef.current = onTap;
  onSelectRef.current = onSelect;
  getAnchorElementRef.current = getAnchorElement;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseCapture = useCallback(() => {
    const el = captureElRef.current;
    const id = pointerIdRef.current;
    if (el && id !== null && el.hasPointerCapture(id)) {
      el.releasePointerCapture(id);
    }
    pointerIdRef.current = null;
    captureElRef.current = null;
  }, []);

  const closeMenu = useCallback(() => {
    menuOpenRef.current = false;
    menuGestureRef.current = false;
    setMenuOpen(false);
    setAnchor(null);
    setHighlighted(null);
    releaseCapture();
  }, [releaseCapture]);

  const registerOptions = useCallback((options: T[], elements: (HTMLElement | null)[]) => {
    optionsRef.current = options;
    optionElsRef.current = elements;
  }, []);

  const updateHighlight = useCallback((x: number, y: number) => {
    const start = startRef.current;
    if (start) {
      const moved = Math.hypot(x - start.x, y - start.y);
      if (moved < HIGHLIGHT_SLOP) {
        setHighlighted(null);
        return;
      }
    }
    setHighlighted(closestOption(x, y, optionElsRef.current, optionsRef.current));
  }, []);

  const resolveAnchor = useCallback((): Point => {
    const el = getAnchorElementRef.current?.();
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return startRef.current ?? { x: 0, y: 0 };
  }, []);

  const finishMenuGesture = useCallback(
    (clientX: number, clientY: number) => {
      if (releaseHandledRef.current) return true;
      if (!menuGestureRef.current && !menuOpenRef.current) return false;
      releaseHandledRef.current = true;
      const start = startRef.current;
      const moved = start ? Math.hypot(clientX - start.x, clientY - start.y) : 0;
      const selected = moved >= HIGHLIGHT_SLOP
        ? highlightedRef.current
        : null;
      closeMenu();
      if (selected !== null) onSelectRef.current(selected);
      return true;
    },
    [closeMenu],
  );

  const openMenu = useCallback(() => {
    menuGestureRef.current = true;
    menuOpenRef.current = true;
    setAnchor(resolveAnchor());
    setMenuOpen(true);
    setHighlighted(null);
  }, [resolveAnchor]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      clearTimer();
      releaseHandledRef.current = false;
      menuGestureRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      captureElRef.current = e.currentTarget;
      pointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        openMenu();
      }, longPressMs);
    },
    [clearTimer, longPressMs, openMenu],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      if (!menuOpenRef.current) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx > MOVE_CANCEL || dy > MOVE_CANCEL) clearTimer();
        return;
      }
      e.preventDefault();
      updateHighlight(e.clientX, e.clientY);
    },
    [clearTimer, updateHighlight],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearTimer();
      if (finishMenuGesture(e.clientX, e.clientY)) {
        startRef.current = null;
        return;
      }
      releaseCapture();
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx <= MOVE_CANCEL && dy <= MOVE_CANCEL) onTapRef.current();
    },
    [clearTimer, finishMenuGesture, releaseCapture],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      clearTimer();
      if (menuOpenRef.current) {
        e.preventDefault();
        return;
      }
      startRef.current = null;
      releaseCapture();
    },
    [clearTimer, releaseCapture],
  );

  const openFromKeyboard = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      releaseHandledRef.current = false;
      const r = el.getBoundingClientRect();
      startRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      openMenu();
    },
    [openMenu],
  );

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const onDocMove = (e: PointerEvent) => {
      e.preventDefault();
      updateHighlight(e.clientX, e.clientY);
    };
    const onDocUp = (e: PointerEvent) => {
      finishMenuGesture(e.clientX, e.clientY);
    };
    const onDocCancel = (e: PointerEvent) => {
      if (menuOpenRef.current) {
        e.preventDefault();
      }
    };
    document.addEventListener("pointermove", onDocMove, { passive: false });
    document.addEventListener("pointerup", onDocUp);
    document.addEventListener("pointercancel", onDocCancel);
    return () => {
      document.removeEventListener("pointermove", onDocMove);
      document.removeEventListener("pointerup", onDocUp);
      document.removeEventListener("pointercancel", onDocCancel);
    };
  }, [finishMenuGesture, menuOpen, updateHighlight]);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  return {
    menuOpen,
    anchor,
    highlighted,
    setHighlighted,
    registerOptions,
    closeMenu,
    openFromKeyboard,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
