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
      className="fixed bottom-0 inset-x-0 glass border-t border-[var(--border-hairline)]
        flex items-stretch z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "3.75rem" }}
      aria-label="Navegación de compras"
    >
      {tabs.map(({ key, label, href, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative
              transition-colors duration-fast
              ${isActive ? "text-brand-600" : "text-ink-faint hover:text-ink-muted"}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex items-center justify-center w-9 h-7 rounded-full transition-all duration-fast
                ${isActive ? "bg-brand-50/90" : "bg-transparent"}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            </span>
            {key === "lista" && badge > 0 && (
              <span
                className="absolute top-1 right-[calc(50%-1.15rem)] min-w-[1rem] px-1
                  text-[0.625rem] font-bold leading-4 text-center rounded-full
                  bg-brand-100 text-brand-700"
              >
                {badge}
              </span>
            )}
            <span className={`text-micro ${isActive ? "font-semibold text-brand-600" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
