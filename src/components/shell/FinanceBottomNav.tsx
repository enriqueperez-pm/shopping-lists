"use client";

import Link from "next/link";
import { Home, PiggyBank, Receipt, ShoppingCart, User } from "lucide-react";
import type { AppModule } from "./app-module";

const tabs: {
  key: AppModule;
  label: string;
  href: string;
  Icon: typeof Home;
}[] = [
  { key: "inicio", label: "Inicio", href: "/inicio", Icon: Home },
  { key: "presupuesto", label: "Presupuesto", href: "/presupuesto", Icon: PiggyBank },
  { key: "gastos", label: "Gastos", href: "/gastos", Icon: Receipt },
  { key: "compras", label: "Compras", href: "/compras/lista", Icon: ShoppingCart },
  { key: "cuenta", label: "Cuenta", href: "/cuenta", Icon: User },
];

export default function FinanceBottomNav({ active }: { active: AppModule }) {
  return (
    <nav
      className="shrink-0 w-full flex border-t border-[var(--border-hairline)] bg-white/95 backdrop-blur-md z-40"
      style={{
        paddingBottom: "var(--safe-bottom, env(safe-area-inset-bottom, 0px))",
        minHeight: "calc(var(--finance-nav-h, 80px) + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))",
        boxShadow: "0 -4px 16px rgb(var(--ink-rgb) / 0.05)",
      }}
      aria-label="Navegación principal"
    >
      {tabs.map(({ key, label, href, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-fast
              ${isActive ? "text-ink" : "text-ink-faint hover:text-ink-muted"}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-colors duration-fast
                ${isActive ? "nav-tab-active-bg" : ""}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            <span className={`text-[0.625rem] ${isActive ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
