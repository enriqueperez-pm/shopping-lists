"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const panelClass =
    variant === "sheet"
      ? `relative z-10 w-full max-w-lg surface-soft rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto ${className}`
      : `relative z-10 w-full max-w-md surface-soft p-4 space-y-3 max-h-[90dvh] overflow-y-auto ${className}`;

  const content = (
    <div
      className={`fixed inset-0 z-[60] ${variant === "sheet" ? "flex items-end justify-center" : "flex items-end sm:items-center justify-center p-4"}`}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={panelClass}
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
      >
        {variant === "sheet" ? (
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--ink-rgb) / 0.12)]" />
        ) : null}
        {title ? (
          <h2 className={variant === "sheet" ? "text-title mb-3" : "text-title"}>{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
