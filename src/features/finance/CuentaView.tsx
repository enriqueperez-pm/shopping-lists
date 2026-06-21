"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Download, LogOut, RefreshCw, Upload, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
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
    isHouseholdMember,
    pushToCloud,
    syncBrainFromCloud,
    importBrainCsv,
  } = useFinance();
  const [busy, setBusy] = useState<string | null>(null);
  const [brainMessage, setBrainMessage] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const handlePushToCloud = async () => {
    setBusy("brain-push");
    setBrainMessage(null);
    const ok = await pushToCloud();
    setBusy(null);
    setBrainMessage(
      ok
        ? "App subida a la nube y al brain. Los CSV en Drive se actualizan con sync:brain:watch."
        : null,
    );
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

  const brainDisabled = busy !== null || !isHouseholdMember;

  return (
    <div
      className="app-scroll-y px-[var(--pad,1rem)] py-3 space-y-4 finance-scroll-pad"
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
          <span className="w-10 h-10 rounded-full bg-[rgb(var(--ink-rgb) / 0.06)] flex items-center justify-center text-ink">
            <User size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Sesión activa</p>
            <p className="text-micro text-ink-faint">
              {isHouseholdMember ? "Cuenta del hogar" : "Cuenta sin acceso al brain compartido"}
            </p>
          </div>
        </div>
        {isHouseholdMember ? (
          <p className="text-caption text-pantry">
            Ves compras y presupuesto compartidos del hogar.
          </p>
        ) : (
          <p className="text-caption text-cart">
            Inicia sesión con una de las dos cuentas del hogar para sincronizar el brain.
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
        <h2 className="text-sm font-semibold text-ink">Brain y nube</h2>
        <p className="text-caption">
          Cada cambio en la app se sube automáticamente al guardar. También puedes forzar la sync
          manualmente. Última sync app:{" "}
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
          disabled={brainDisabled}
          onClick={() => void handlePushToCloud()}
        >
          <CloudUpload size={16} />
          {busy === "brain-push" ? "Subiendo…" : "Subir cambios de la app al brain"}
        </button>
        <button
          type="button"
          className="btn-soft w-full justify-center gap-2 py-2.5"
          disabled={brainDisabled}
          onClick={() => void handleSyncBrainFromCloud()}
        >
          <RefreshCw size={16} />
          {busy === "brain-sync" ? "Sincronizando…" : "Traer brain desde la nube"}
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
          disabled={brainDisabled}
          onClick={() => csvInputRef.current?.click()}
        >
          <Upload size={16} />
          {busy === "brain-import" ? "Importando…" : "Importar CSV del brain"}
        </button>
        <button
          type="button"
          className="btn-soft w-full justify-center gap-2 py-2.5"
          disabled={brainDisabled}
          onClick={handleExportBrainCsv}
        >
          <Download size={16} />
          Exportar CSV para brain (ZIP)
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
