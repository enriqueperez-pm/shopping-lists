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

    <div className="h-screen-safe flex flex-col overflow-hidden bg-app">

      <SyncStatusBanner />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>

      <FinanceBottomNav active={module} />

    </div>

  );

}

