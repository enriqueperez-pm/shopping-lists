"use client";

import type { ReactNode } from "react";
import ModuleNav, { type AppModule } from "./ModuleNav";

export default function AppShell({
  module,
  children,
}: {
  module: AppModule;
  children: ReactNode;
}) {
  return (
    <div className="h-screen-safe flex flex-col overflow-hidden">
      <ModuleNav active={module} />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
