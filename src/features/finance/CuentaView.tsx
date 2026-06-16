"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, RefreshCw, Upload, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { HOUSEHOLD_MEMBER_IDS } from "@/lib/household";
import PageHeader from "@/components/ui/PageHeader";
import { clearLocalFinanceStorage, isFinancialPersistedData } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import { downloadBrainCsvZip } from "./brain-sync";

export default function CuentaView() {
  const router = useRouter();
  const {
    db,
    reloadFromCloud,
    cloudSyncError,
    brainSyncError,
    brainSnapshotUpdatedAt,
    lastCloudSyncAt,
    syncBrainFromCloud,
    importBrainCsv,
  } = useFinance();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [brainMessage, setBrainMessage] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const handleSyncBrainFromCloud = async () => {
    setBusy("brain-sync");
    setBrainMessage(null);
    const ok = await syncBrainFromCloud();
    setBusy(null);
    setBrainMessage(
      ok
        ? "Brain fusionado con la nube. Tus ediciones recientes en la app se conservaron."
        : null,
    );
  };

  const handleImportBrainCsv = async (files: FileList | null) => {
    if (!files?.length) return;
    if (
      !window.confirm(
        "Se fusionarán estos CSV con la nube. Las ediciones manuales en la app se conservan si son más recientes. ¿Continuar?",
      )
    ) {
      return;
    }
    setBusy("brain-import");
    setBrainMessage(null);
    const ok = await importBrainCsv(Array.from(files));
    setBusy(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
    setBrainMessage(ok ? "CSV del brain importados y fusionados con la nube." : null);
  };

  const handleExportBrainCsv = () => {
    const payload = db.exportFullStateObject();
    if (!isFinancialPersistedData(payload)) {
      setBrainMessage("No hay datos financieros para exportar.");
      return;
    }
    downloadBrainCsvZip(payload);
    setBrainMessage("ZIP descargado. Guarda los CSV en tu carpeta brain/finanzas/data.");
  };

  const snapshotLabel = brainSnapshotUpdatedAt
    ? new Date(brainSnapshotUpdatedAt).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Sin snapshot en la nube";

  const cloudSyncLabel = lastCloudSyncAt
    ? new Date(lastCloudSyncAt).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Pendiente";

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
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

      {isHousehold ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Brain y nube (automático)</h2>
          <p className="text-caption">
            Cada cambio en la app se sube a Supabase y al brain en la nube al guardar. Entre
            dispositivos se actualiza en tiempo real. Última sync app:{" "}
            <span className="font-medium text-ink-muted">{cloudSyncLabel}</span>
            {" · "}
            brain: <span className="font-medium text-ink-muted">{snapshotLabel}</span>
          </p>
          <p className="text-caption text-ink-faint">
            Para que los CSV en Drive se actualicen solos, deja corriendo en tu PC:{" "}
            <code className="text-micro">npm run sync:brain:watch</code>
          </p>
          {brainSyncError ? (
            <p className="text-caption text-cart">{brainSyncError}</p>
          ) : null}
          {brainMessage ? (
            <p className="text-caption text-pantry">{brainMessage}</p>
          ) : null}
          <button
            type="button"
            className="btn-primary w-full justify-center gap-2 py-2.5"
            disabled={busy !== null}
            onClick={() => void handleSyncBrainFromCloud()}
          >
            <RefreshCw size={16} />
            {busy === "brain-sync" ? "Sincronizando…" : "Sincronizar desde brain (nube)"}
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={(e) => void handleImportBrainCsv(e.target.files)}
          />
          <button
            type="button"
            className="btn-soft w-full justify-center gap-2 py-2.5"
            disabled={busy !== null}
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload size={16} />
            {busy === "brain-import" ? "Importando…" : "Importar CSV del brain"}
          </button>
          <button
            type="button"
            className="btn-soft w-full justify-center gap-2 py-2.5"
            disabled={busy !== null}
            onClick={handleExportBrainCsv}
          >
            <Download size={16} />
            Exportar CSV para brain (ZIP)
          </button>
        </section>
      ) : null}

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
