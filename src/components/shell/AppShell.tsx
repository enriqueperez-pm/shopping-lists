"use client";

import type { ReactNode } from "react";
import FinanceBottomNav from "./FinanceBottomNav";
import SyncStatusBanner from "./SyncStatusBanner";
import type { AppModule } from "./app-module";

export default function AppShell({
  module,
  children,
}: {
  module: AppModule;
  children: ReactNode;
}) {
  return (
    <div className="h-screen-safe flex flex-col lg:flex-row overflow-hidden bg-app">
      <FinanceBottomNav active={module} />
      <div className="order-1 flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden lg:order-2">
        <SyncStatusBanner />
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
