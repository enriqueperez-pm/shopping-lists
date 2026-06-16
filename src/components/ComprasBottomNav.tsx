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
      className="fixed inset-x-0 border-t border-[var(--border-hairline)] bg-white/92 backdrop-blur-md flex items-stretch z-40 shadow-[0_-8px_24px_rgba(21,49,49,0.06)]"
      style={{
        bottom: "calc(var(--finance-nav-h, 64px) + env(safe-area-inset-bottom, 0px))",
        height: "var(--compras-nav-h, 60px)",
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
              className={`flex items-center justify-center w-8 h-8 rounded-[10px] transition-colors duration-fast
                ${isActive ? "bg-[rgba(21,49,49,0.06)] text-ink" : ""}`}
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
