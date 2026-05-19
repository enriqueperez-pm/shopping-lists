"use client";

import { Home, ShoppingCart } from "lucide-react";

type Tab = "despensa" | "lista";

export default function BottomNav({
  active,
  onChange,
  badge,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  badge: number;
}) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 glass border-t border-slate-200/80
        flex items-stretch z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "3.8rem" }}
      aria-label="Navegacion principal"
    >
      <button
        onClick={() => onChange("despensa")}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5
          transition-colors touch-target
          ${active === "despensa" ? "text-brand-600 font-bold" : "text-slate-400 font-medium"}`}
        aria-current={active === "despensa" ? "page" : undefined}
        aria-label="Despensa"
      >
        <Home size={22} strokeWidth={active === "despensa" ? 2.5 : 2} />
        <span className="text-[.68rem] tracking-wide uppercase">Despensa</span>
      </button>

      <button
        onClick={() => onChange("lista")}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5
          transition-colors touch-target relative
          ${active === "lista" ? "text-brand-600 font-bold" : "text-slate-400 font-medium"}`}
        aria-current={active === "lista" ? "page" : undefined}
        aria-label={`Lista de compras, ${badge} articulos`}
      >
        <ShoppingCart size={22} strokeWidth={active === "lista" ? 2.5 : 2} />
        {badge > 0 && (
          <span className="absolute top-1.5 right-[calc(50%-1.1rem)] translate-x-full
            bg-pink-100 text-pink-600 border border-pink-300 text-[.6rem] font-bold
            rounded-full min-w-[1.1rem] px-1 text-center leading-[1.05rem]">
            {badge}
          </span>
        )}
        <span className="text-[.68rem] tracking-wide uppercase">Lista</span>
      </button>
    </nav>
  );
}
