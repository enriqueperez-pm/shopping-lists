"use client";

import Link from "next/link";
import { useFinance } from "@/features/finance/FinancialDbProvider";

export default function SyncStatusBanner() {
  const { cloudSyncError, cloudHydrated } = useFinance();

  if (!cloudHydrated || !cloudSyncError) return null;

  return (
    <div className="shrink-0 mx-[var(--pad,1rem)] mt-2 px-3 py-2.5 rounded-lg bg-cart/10 border border-cart/30 text-sm text-ink">
      <p className="font-medium">No se pudieron cargar tus finanzas desde la nube</p>
      <p className="text-caption mt-0.5">{cloudSyncError}</p>
      <p className="text-caption mt-1">
        Ve a{" "}
        <Link href="/cuenta" className="text-brand-600 font-semibold underline">
          Cuenta
        </Link>{" "}
        → Recargar desde la nube. Si persiste, avisa para volver a subir el brain.
      </p>
    </div>
  );
}
