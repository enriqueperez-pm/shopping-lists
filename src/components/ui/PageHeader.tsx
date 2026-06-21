import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  /** Franja azul profundo FLUJO (barra superior) */
  band?: boolean;
};

export default function PageHeader({ title, subtitle, actions, className = "", band = true }: Props) {
  const inner = (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-title">{title}</h1>
        {subtitle ? <p className="text-caption mt-0.5 font-body">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );

  if (band) {
    return <header className="page-header-band">{inner}</header>;
  }

  return inner;
}
