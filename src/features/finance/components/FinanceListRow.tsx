"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  amount?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  highlight?: boolean;
  showChevron?: boolean;
  className?: string;
};

export default function FinanceListRow({
  title,
  subtitle,
  amount,
  trailing,
  onClick,
  highlight,
  showChevron = true,
  className = "",
}: Props) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`finance-list-row ${highlight ? "finance-list-row-highlight" : ""} ${className}`}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-ink truncate">{title}</p>
        {subtitle ? <p className="text-micro text-ink-faint truncate mt-0.5">{subtitle}</p> : null}
      </div>
      {amount ? <div className="shrink-0 text-right tabular-nums">{amount}</div> : null}
      {trailing}
      {showChevron && onClick ? (
        <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden />
      ) : null}
    </Tag>
  );
}
