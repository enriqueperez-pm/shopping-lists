import type { ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function FinanceListSection({ title, action, children, className = "" }: Props) {
  return (
    <section className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
