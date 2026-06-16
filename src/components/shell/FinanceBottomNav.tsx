"use client";

import Link from "next/link";
import { Home, PiggyBank, Receipt, ShoppingCart, User } from "lucide-react";
import type { AppModule } from "./ModuleNav";

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
      className="fixed bottom-0 inset-x-0 z-50 flex border-t border-[var(--border-hairline)] bg-white/92 backdrop-blur-md shadow-[0_-8px_24px_rgba(21,49,49,0.06)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(var(--finance-nav-h, 64px) + env(safe-area-inset-bottom, 0px))",
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
              className={`flex items-center justify-center w-8 h-8 rounded-[10px] transition-colors duration-fast
                ${isActive ? "bg-[rgba(21,49,49,0.06)] text-ink" : ""}`}
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
