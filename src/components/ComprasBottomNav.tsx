"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, ShoppingCart } from "lucide-react";

const tabs = [
  { key: "despensa", label: "Despensa", href: "/compras/despensa", Icon: Home },
  { key: "lista", label: "Lista", href: "/compras/lista", Icon: ShoppingCart },
  { key: "historial", label: "Historial", href: "/compras/historial", Icon: History },
] as const;

export default function ComprasBottomNav({ badge }: { badge: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="shrink-0 w-full border-t border-[var(--border-hairline)] bg-white/95 backdrop-blur-md flex items-stretch z-30"
      style={{
        minHeight: "var(--compras-nav-h, 60px)",
        boxShadow: "0 -4px 16px rgb(var(--ink-rgb) / 0.05)",
      }}
      aria-label="Navegación de compras"
    >
      {tabs.map(({ key, label, href, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative py-2 transition-colors duration-fast
              ${isActive ? "text-ink" : "text-ink-faint hover:text-ink-muted"}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-colors duration-fast
                ${isActive ? "nav-tab-active-bg" : ""}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            {key === "lista" && badge > 0 && (
              <span
                className="absolute top-1 right-[calc(50%-1.15rem)] min-w-[1rem] px-1
                  text-[0.625rem] font-bold leading-4 text-center rounded-full
                  bg-cart-light text-cart"
              >
                {badge}
              </span>
            )}
            <span className={`text-[0.625rem] ${isActive ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
