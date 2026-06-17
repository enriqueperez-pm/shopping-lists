"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useFinance } from "../FinancialDbProvider";

export default function FinanceSyncBar() {
  const {
    isSyncDirty,
    syncInFlight,
    lastCloudSyncAt,
    cloudSyncError,
    brainSyncError,
    saveAndSyncAll,
    isHouseholdMember,
  } = useFinance();

  if (!isHouseholdMember) return null;

  const statusLabel = syncInFlight
    ? "Sincronizando…"
    : cloudSyncError || brainSyncError
      ? "Error de sync"
      : isSyncDirty
        ? "Cambios pendientes"
        : lastCloudSyncAt
          ? "En nube ✓"
          : "Guardado local";

  return (
    <div className="sticky bottom-0 z-30 -mx-[var(--pad,1rem)] px-[var(--pad,1rem)] py-2 bg-[rgba(255,255,255,0.92)] backdrop-blur border-t border-[var(--border-hairline)]">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 text-caption text-ink-muted">
          {syncInFlight ? (
            <Loader2 size={14} className="animate-spin shrink-0" />
          ) : isSyncDirty || cloudSyncError ? (
            <CloudOff size={14} className="shrink-0 text-cart" />
          ) : (
            <Cloud size={14} className="shrink-0 text-pantry" />
          )}
          <span className="truncate">{statusLabel}</span>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0 text-sm py-2"
          disabled={syncInFlight}
          onClick={() => void saveAndSyncAll()}
        >
          Guardar y sincronizar
        </button>
      </div>
      {cloudSyncError || brainSyncError ? (
        <p className="text-micro text-danger mt-1 truncate">{cloudSyncError || brainSyncError}</p>
      ) : null}
      <p className="text-micro text-ink-faint mt-0.5">
        CSV en Drive se actualizan con sync:brain en tu PC
      </p>
    </div>
  );
}
