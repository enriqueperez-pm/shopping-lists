"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Download, Loader2, LogOut, RefreshCw, Upload, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import { clearLocalFinanceStorage, isFinancialPersistedData } from "./FinancialDatabase";
import { useFinance } from "./FinancialDbProvider";
import { downloadBrainCsvZip } from "./brain-sync";

type BrainMessage =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

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
    syncInFlight,
  } = useFinance();
  const [busy, setBusy] = useState<string | null>(null);
  const [brainMessage, setBrainMessage] = useState<BrainMessage | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const formatSyncTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
      : null;

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
    if (ok) {
      const at = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
      const txCount = db.getTransactions().length;
      setBrainMessage({
        kind: "success",
        text: `Subido a la nube (${at}). ${txCount} movimientos en snapshot. Para CSV en Drive: npm run sync:brain:pull en tu PC (o deja sync:brain:watch corriendo).`,
      });
    } else {
      setBrainMessage({
        kind: "error",
        text:
          cloudSyncError ||
          brainSyncError ||
          "No se pudo subir. Revisa conexión e inicia sesión con la cuenta del hogar.",
      });
    }
  };

  const handleSyncBrainFromCloud = async () => {
    setBusy("brain-sync");
    setBrainMessage(null);
    const ok = await syncBrainFromCloud();
    setBusy(null);
    if (ok) {
      setBrainMessage({
        kind: "success",
        text: "Brain fusionado con la nube. Tus ediciones recientes en la app se conservaron.",
      });
    } else {
      setBrainMessage({
        kind: "error",
        text: cloudSyncError || brainSyncError || "No se pudo traer el brain desde la nube.",
      });
    }
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
    if (ok) {
      setBrainMessage({ kind: "success", text: "CSV del brain importados y fusionados con la nube." });
    } else {
      setBrainMessage({
        kind: "error",
        text: brainSyncError || cloudSyncError || "No se pudieron importar los CSV.",
      });
    }
  };

  const handleExportBrainCsv = () => {
    const payload = db.exportFullStateObject();
    if (!isFinancialPersistedData(payload)) {
      setBrainMessage({ kind: "error", text: "No hay datos financieros para exportar." });
      return;
    }
    downloadBrainCsvZip(payload);
    setBrainMessage({
      kind: "success",
      text: "ZIP descargado. Guarda los CSV en tu carpeta brain/finanzas/data.",
    });
  };

  const snapshotLabel = formatSyncTime(brainSnapshotUpdatedAt) ?? "Sin snapshot en la nube";
  const cloudSyncLabel = formatSyncTime(lastCloudSyncAt) ?? "Pendiente";
  const isBusy = busy !== null || syncInFlight;
  const brainDisabled = isBusy || !isHouseholdMember;

  return (
    <div className="app-page finance-scroll-pad space-y-4">
      <div className="app-page-inner-finance space-y-4">
      <PageHeader title="Cuenta" subtitle="Sesión y datos del dispositivo" />

      {cloudSyncError && !brainMessage ? (
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
          disabled={isBusy}
          onClick={handleReloadFromCloud}
        >
          <RefreshCw size={16} />
          {busy === "reload" ? "Recargando…" : "Recargar desde la nube"}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Brain y nube</h2>
        <p className="text-caption">
          Al guardar un gasto se sube a la nube y al snapshot del brain. Este botón fuerza la subida
          manualmente. Última sync app:{" "}
          <span className="font-medium text-ink-muted">{cloudSyncLabel}</span>
          {" · "}
          snapshot: <span className="font-medium text-ink-muted">{snapshotLabel}</span>
        </p>
        <p className="text-caption text-ink-faint">
          Los CSV en Google Drive <strong>no</strong> se escriben desde el navegador. En tu PC:{" "}
          <code className="text-micro">npm run sync:brain:pull</code> (una vez) o{" "}
          <code className="text-micro">npm run sync:brain:watch</code> (continuo).
        </p>
        {brainSyncError && !brainMessage ? (
          <p className="text-caption text-cart">{brainSyncError}</p>
        ) : null}
        {brainMessage ? (
          <p
            className={`text-caption ${brainMessage.kind === "success" ? "text-pantry" : "text-cart"}`}
          >
            {brainMessage.text}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary w-full justify-center gap-2 py-2.5"
          disabled={brainDisabled}
          onClick={() => void handlePushToCloud()}
        >
          {busy === "brain-push" || syncInFlight ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CloudUpload size={16} />
          )}
          {busy === "brain-push" || syncInFlight ? "Subiendo…" : "Subir a la nube"}
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
          disabled={isBusy}
          onClick={() => void handleLogout()}
        >
          <LogOut size={16} />
          {busy === "logout" ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </section>
      </div>
    </div>
  );
}
