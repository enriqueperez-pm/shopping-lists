"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";
import FinancialDbProvider from "@/features/finance/FinancialDbProvider";
import { usePathname } from "next/navigation";
import type { AppModule } from "@/components/shell/ModuleNav";

function resolveModule(pathname: string): AppModule {
  if (pathname.startsWith("/presupuesto")) return "presupuesto";
  if (pathname.startsWith("/gastos")) return "gastos";
  if (pathname.startsWith("/compras")) return "compras";
  return "inicio";
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const module = resolveModule(pathname);

  return (
    <FinancialDbProvider>
      <AppShell module={module}>{children}</AppShell>
    </FinancialDbProvider>
  );
}
