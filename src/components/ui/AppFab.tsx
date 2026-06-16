"use client";

import type { ReactNode } from "react";

type Props = {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
  variant?: "finance" | "compras" | "lista";
  className?: string;
};

export default function AppFab({
  onClick,
  ariaLabel,
  children,
  variant = "finance",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-fab ${
        variant === "lista"
          ? "app-fab-lista"
          : variant === "compras"
            ? "app-fab-compras"
            : ""
      } ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
