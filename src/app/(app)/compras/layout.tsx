"use client";

import ShoppingProvider, { useShoppingContext } from "@/features/shopping/ShoppingProvider";
import ComprasBottomNav from "@/components/ComprasBottomNav";
import Toast from "@/components/Toast";
import type { ReactNode } from "react";

function ComprasChrome({ children }: { children: ReactNode }) {
  const { badge } = useShoppingContext();
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {children}
      <ComprasBottomNav badge={badge} />
      <Toast />
    </div>
  );
}

export default function ComprasLayout({ children }: { children: ReactNode }) {
  return (
    <ShoppingProvider>
      <ComprasChrome>{children}</ComprasChrome>
    </ShoppingProvider>
  );
}
