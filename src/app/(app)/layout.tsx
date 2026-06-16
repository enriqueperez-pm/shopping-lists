"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";
import FinancialDbProvider from "@/features/finance/FinancialDbProvider";
import { usePathname } from "next/navigation";
import type { AppModule } from "@/components/shell/app-module";

function resolveModule(pathname: string): AppModule {
  if (pathname.startsWith("/presupuesto")) return "presupuesto";
  if (pathname.startsWith("/gastos")) return "gastos";
  if (pathname.startsWith("/compras")) return "compras";
  if (pathname.startsWith("/cuenta")) return "cuenta";
  return "inicio";
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const module = resolveModule(pathname);

  return (
    <FinancialDbProvider>
      <AppShell module={module}>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</div>
      </AppShell>
    </FinancialDbProvider>
  );
}
