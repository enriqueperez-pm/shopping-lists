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
      className={`fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+.5rem)] left-1/2
        -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-semibold text-white
        bg-slate-800 shadow-lg max-w-[calc(100vw-2rem)]
        transition-all duration-300 ${
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
    >
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <span className="text-center">{message}</span>
        {showUndoBtn && (
          <button
            type="button"
            onClick={handleUndo}
            className="shrink-0 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25
              text-white font-bold text-xs uppercase tracking-wide transition-colors"
          >
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}
