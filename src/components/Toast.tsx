"use client";

import { useEffect, useRef, useState } from "react";

type UndoPayload = {
  message: string;
  onUndo: () => void;
};

let globalShow: (msg: string) => void = () => {};
let globalShowUndo: (payload: UndoPayload & { durationMs?: number }) => void = () => {};

export function showToast(msg: string) {
  globalShow(msg);
}

export function showUndoToast(payload: UndoPayload & { durationMs?: number }) {
  globalShowUndo(payload);
}

export default function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [showUndoBtn, setShowUndoBtn] = useState(false);
  const undoRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setShowUndoBtn(false);
    undoRef.current = null;
  };

  useEffect(() => {
    globalShow = (msg: string) => {
      hide();
      setMessage(msg);
      setShowUndoBtn(false);
      undoRef.current = null;
      setVisible(true);
      timerRef.current = setTimeout(hide, 2200);
    };

    globalShowUndo = ({ message: msg, onUndo, durationMs = 10000 }) => {
      hide();
      setMessage(msg);
      setShowUndoBtn(true);
      undoRef.current = onUndo;
      setVisible(true);
      timerRef.current = setTimeout(hide, durationMs);
    };

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleUndo = () => {
    undoRef.current?.();
    hide();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-body font-semibold text-white
        max-w-[calc(100vw-2rem)] shadow-float
        transition-all duration-toast ease-out ${
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto bg-[color-mix(in_srgb,var(--ink)_92%,transparent)] backdrop-blur-md"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      style={{
        bottom: "calc(var(--finance-nav-h, 80px) + var(--compras-nav-h, 0px) + var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 0.75rem)",
      }}
    >
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <span className="text-center">{message}</span>
        {showUndoBtn && (
          <button
            type="button"
            onClick={handleUndo}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25
              text-white font-semibold text-micro uppercase tracking-wide transition-colors duration-fast"
          >
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}
