"use client";

import { useEffect, useState } from "react";

let globalShow: (msg: string) => void = () => {};

export function showToast(msg: string) {
  globalShow(msg);
}

export default function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    globalShow = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2200);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+.5rem)] left-1/2
        -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white
        bg-slate-800 shadow-lg whitespace-nowrap max-w-[calc(100vw-2rem)] text-center
        transition-all duration-300 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
    >
      {message}
    </div>
  );
}
