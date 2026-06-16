"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "centered" | "sheet";
  title?: string;
  className?: string;
};

export default function ModalShell({
  open,
  onClose,
  children,
  variant = "centered",
  title,
  className = "",
}: Props) {
  if (!open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[60] bg-black/30"
      aria-hidden
      onClick={onClose}
    />
  );

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        {overlay}
        <div
          className={`relative w-full max-w-lg surface-soft rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto ${className}`}
          role="dialog"
          aria-modal
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgba(21,49,49,0.12)]" />
          {title ? <h2 className="text-title mb-3">{title}</h2> : null}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      {overlay}
      <div
        className={`relative w-full max-w-md surface-soft p-4 space-y-3 max-h-[90dvh] overflow-y-auto ${className}`}
        role="dialog"
        aria-modal
      >
        {title ? <h2 className="text-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
