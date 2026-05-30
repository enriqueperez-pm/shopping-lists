"use client";

import { History, Home, ShoppingCart } from "lucide-react";

export type Tab = "despensa" | "lista" | "historial";

export default function BottomNav({
  active,
  onChange,
  badge,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  badge: number;
}) {
  const tabs: { key: Tab; label: string; Icon: typeof Home }[] = [
    { key: "despensa", label: "Despensa", Icon: Home },
    { key: "lista", label: "Lista", Icon: ShoppingCart },
    { key: "historial", label: "Historial", Icon: History },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 glass border-t border-[rgba(21,49,49,0.08)]
        flex items-stretch z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "3.8rem" }}
      aria-label="Navegacion principal"
    >
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative
            ${active === key ? "text-brand-600" : "text-ink-faint"}`}
          aria-current={active === key ? "page" : undefined}
          aria-label={label}
        >
          <Icon size={19} strokeWidth={active === key ? 2.5 : 2} />
          {key === "lista" && badge > 0 && (
            <span className="absolute top-1.5 right-[calc(50%-0.9rem)] translate-x-full
              bg-brand-100 text-brand-600 text-[.55rem] font-bold
              rounded-full min-w-[1rem] px-1 text-center leading-4">
              {badge}
            </span>
          )}
          <span className="text-[.58rem]">{label}</span>
        </button>
      ))}
    </nav>
  );
}
