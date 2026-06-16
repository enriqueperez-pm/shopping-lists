"use client";

import Link from "next/link";
import { Home, PiggyBank, Receipt, ShoppingCart, User } from "lucide-react";

export type AppModule = "inicio" | "presupuesto" | "gastos" | "compras" | "cuenta";

const modules: {
  key: AppModule;
  label: string;
  href: string;
  Icon: typeof Home;
  enabled: boolean;
}[] = [
  { key: "inicio", label: "Inicio", href: "/inicio", Icon: Home, enabled: true },
  { key: "presupuesto", label: "Presupuesto", href: "/presupuesto", Icon: PiggyBank, enabled: true },
  { key: "gastos", label: "Gastos", href: "/gastos", Icon: Receipt, enabled: true },
  { key: "compras", label: "Compras", href: "/compras/lista", Icon: ShoppingCart, enabled: true },
  { key: "cuenta", label: "Cuenta", href: "/cuenta", Icon: User, enabled: true },
];

export default function ModuleNav({ active }: { active: AppModule }) {
  return (
    <nav
      className="shrink-0 flex border-b border-[var(--border-hairline)] bg-white/70 backdrop-blur-sm"
      aria-label="Módulos de la app"
    >
      {modules.map(({ key, label, href, Icon, enabled }) => {
        const isActive = active === key;
        if (!enabled) {
          return (
            <span
              key={key}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-ink-faint/40 cursor-not-allowed"
              aria-disabled
              title="Próximamente"
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-[0.625rem] font-medium">{label}</span>
            </span>
          );
        }
        return (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-fast
              ${isActive ? "text-brand-600 bg-brand-50/50" : "text-ink-faint hover:text-ink-muted"}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} />
            <span className={`text-[0.625rem] ${isActive ? "font-semibold" : "font-medium"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
