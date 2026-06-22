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
      className="order-2 shrink-0 z-40 flex w-full border-t border-[var(--border-hairline)] bg-white/95 backdrop-blur-md finance-nav
        lg:order-1 lg:h-auto lg:min-h-0 lg:w-[var(--sidebar-w)] lg:flex-col lg:border-t-0 lg:border-r lg:self-stretch lg:py-5 lg:px-3 lg:gap-1"
      style={{
        paddingBottom: "var(--safe-bottom, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Navegación principal"
    >
      <div className="hidden lg:block px-3 pb-4 mb-2 border-b border-[var(--border-hairline)]">
        <p className="text-product-name font-semibold text-ink">klagi</p>
        <p className="text-micro text-ink-faint mt-0.5">Finanzas</p>
      </div>
      {tabs.map(({ key, label, href, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-fast
              lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5 lg:w-full
              ${isActive ? "text-ink" : "text-ink-faint hover:text-ink-muted"}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-colors duration-fast
                lg:h-8 lg:w-8 lg:rounded-xl
                ${isActive ? "nav-tab-active-bg" : ""}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            <span
              className={`text-[0.625rem] lg:text-sm lg:flex-1 lg:text-left
                ${isActive ? "font-semibold" : "font-medium"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
