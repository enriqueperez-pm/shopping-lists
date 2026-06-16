"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { HOUSEHOLD_MEMBER_IDS } from "@/lib/household";
import PageHeader from "@/components/ui/PageHeader";
import { clearLocalFinanceStorage } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";

export default function CuentaView() {
  const router = useRouter();
  const { reloadFromCloud, cloudSyncError } = useFinance();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void getBrowserSupabase()
      .auth.getUser()
      .then(({ data }: { data: { user: { email?: string; id?: string } | null } }) => {
        setEmail(data.user?.email ?? null);
        setUserId(data.user?.id ?? null);
      });
  }, []);

  const isHousehold =
    userId && (HOUSEHOLD_MEMBER_IDS as readonly string[]).includes(userId);

  const handleReloadFromCloud = () => {
    if (
      !window.confirm(
        "Se borrarán los datos financieros guardados en ESTE dispositivo/navegador y se volverán a bajar desde la nube. ¿Continuar?",
      )
    ) {
      return;
    }
    setBusy("reload");
    reloadFromCloud();
  };

  const handleLogout = async () => {
    setBusy("logout");
    await getBrowserSupabase().auth.signOut();
    clearLocalFinanceStorage();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad-compact"
      style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
    >
      <PageHeader title="Cuenta" subtitle="Sesión y datos del dispositivo" />

      {cloudSyncError ? (
        <div className="surface-soft p-3 border border-cart/30 text-sm">
          <p className="font-medium text-cart">Problema con la nube</p>
          <p className="text-caption mt-0.5">{cloudSyncError}</p>
        </div>
      ) : null}

      <div className="surface-soft p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-[rgba(21,49,49,0.06)] flex items-center justify-center text-ink">
            <User size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{email ?? "…"}</p>
            <p className="text-micro text-ink-faint truncate">{userId ?? ""}</p>
          </div>
        </div>
        {isHousehold ? (
          <p className="text-caption text-pantry">Cuenta del hogar — ves compras y presupuesto compartidos.</p>
        ) : (
          <p className="text-caption text-cart">
            Esta cuenta no es una de las dos del hogar. Puede que no veas el presupuesto del brain.
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Datos en este dispositivo</h2>
        <p className="text-caption">
          Si la web muestra $0 pero el teléfono sí tiene datos, usa recargar desde la nube (no borra Supabase).
        </p>
        <button
          type="button"
          className="btn-soft w-full justify-center gap-2 py-2.5"
          disabled={busy !== null}
          onClick={handleReloadFromCloud}
        >
          <RefreshCw size={16} />
          {busy === "reload" ? "Recargando…" : "Recargar desde la nube"}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Sesión</h2>
        <button
          type="button"
          className="btn-primary w-full justify-center gap-2 py-2.5"
          disabled={busy !== null}
          onClick={() => void handleLogout()}
        >
          <LogOut size={16} />
          {busy === "logout" ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </section>
    </div>
  );
}
