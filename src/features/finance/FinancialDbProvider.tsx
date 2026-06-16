"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  FinancialDatabase,
  clearLocalFinanceStorage,
  isFinancialPersistedData,
  type EnhancedTransaction,
  type FinancialPersistedData,
} from "./FinancialDatabase";
import { fetchUserFinancialPayload, upsertUserFinancialPayload, fetchBrainSnapshot, upsertBrainSnapshot } from "./financialSupabaseSync";
import { mergeFinancialPayloads } from "./financialPayloadMerge";
import {
  buildPayloadFromBrainCsv,
  brainCsvInputsFromFiles,
  mergeBrainWithRemote,
  validateBrainCsvInputs,
  type BrainCsvInputs,
} from "./brain-sync";
import { ensureBaselineBudgetTaxonomy, ensureBaselineIncomeConcepts, ensurePeriodConceptHierarchy, dedupeBudgetConceptsInDb, getBudgetConcepts } from "./finance-linking";
import { setFinanceDb } from "./finance-bridge";
import { HOUSEHOLD_MEMBER_IDS, resolveCloudPayloadUserId } from "@/lib/household";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type FinanceContextValue = {
  db: FinancialDatabase;
  transactions: EnhancedTransaction[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  refresh: () => void;
  userId: string | null;
  cloudHydrated: boolean;
  cloudSyncError: string | null;
  brainSyncError: string | null;
  brainSnapshotUpdatedAt: string | null;
  reloadFromCloud: () => void;
  syncBrainFromCloud: () => Promise<boolean>;
  importBrainCsv: (files: File[]) => Promise<boolean>;
  refreshBrainSnapshotMeta: () => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinancialDbProvider");
  return ctx;
}

export default function FinancialDbProvider({ children }: { children: ReactNode }) {
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [brainSyncError, setBrainSyncError] = useState<string | null>(null);
  const [brainSnapshotUpdatedAt, setBrainSnapshotUpdatedAt] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const dbRef = useRef<FinancialDatabase | null>(null);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncInFlightRef = useRef(false);
  const cloudSyncDirtyRef = useRef(false);

  const [db] = useState(() => {
    const inst = new FinancialDatabase({
      onAfterSave: () => {
        if (!cloudHydrated) return;
        cloudSyncDirtyRef.current = true;
        if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
        cloudTimerRef.current = setTimeout(() => {
          void runCloudSync("save");
        }, 800);
      },
    });
    dbRef.current = inst;
    setFinanceDb(inst);
    return inst;
  });

  const refresh = useCallback(() => {
    ensureBaselineBudgetTaxonomy(db, selectedPeriod);
    ensureBaselineIncomeConcepts(db, selectedPeriod);
    ensurePeriodConceptHierarchy(db, selectedPeriod);
    dedupeBudgetConceptsInDb(db);
    setTransactions(db.getTransactions(selectedPeriod));
  }, [db, selectedPeriod]);

  useEffect(() => {
    if (!cloudHydrated) return;
    refresh();
  }, [refresh, cloudHydrated]);

  const runCloudSync = useCallback(async (reason: string = "sync") => {
    if (cloudSyncInFlightRef.current) return false;
    const d = dbRef.current;
    const uid = userIdRef.current;
    const payloadUserId = resolveCloudPayloadUserId(uid);
    if (!d || !payloadUserId || !isSupabaseConfigured()) return false;
    cloudSyncInFlightRef.current = true;
    try {
      d.captureModuleDataFromLocalStorage({ persist: true });
      const payload = d.exportFullStateObject() as unknown as Record<string, unknown>;
      const ok = await upsertUserFinancialPayload(payloadUserId, payload);
      if (!ok) {
        cloudSyncDirtyRef.current = true;
        return false;
      }
      cloudSyncDirtyRef.current = false;
      return true;
    } catch (error) {
      console.error(`[Supabase] Sync error (${reason}):`, error);
      cloudSyncDirtyRef.current = true;
      return false;
    } finally {
      cloudSyncInFlightRef.current = false;
    }
  }, []);

  const refreshBrainSnapshotMeta = useCallback(async () => {
    const { row, error } = await fetchBrainSnapshot();
    if (error) {
      setBrainSyncError(error);
      return;
    }
    setBrainSnapshotUpdatedAt(row?.updated_at ?? null);
    if (row) setBrainSyncError(null);
  }, []);

  const applyBrainPayloadMerge = useCallback(
    async (
      brainPayload: FinancialPersistedData,
      snapshotSource: "csv" | "app_import" | "cli",
    ): Promise<boolean> => {
      const d = dbRef.current;
      const uid = userIdRef.current;
      const payloadUserId = resolveCloudPayloadUserId(uid);
      if (!d || !payloadUserId || !isSupabaseConfigured()) {
        setBrainSyncError("No hay sesión del hogar o Supabase no está configurado.");
        return false;
      }

      setBrainSyncError(null);

      const { row: remoteRow, error: remoteError } = await fetchUserFinancialPayload(payloadUserId);
      if (remoteError) {
        setBrainSyncError(remoteError);
        return false;
      }

      const remotePayload =
        remoteRow?.payload && isFinancialPersistedData(remoteRow.payload)
          ? remoteRow.payload
          : null;

      const brainMerged = mergeBrainWithRemote(brainPayload, remotePayload);
      const localPayload = d.exportFullStateObject() as FinancialPersistedData;
      const finalMerged = mergeFinancialPayloads(localPayload, brainMerged);

      const snapshotOk = await upsertBrainSnapshot(brainPayload, snapshotSource);
      if (!snapshotOk) {
        setBrainSyncError("No se pudo guardar el snapshot del brain en la nube.");
        return false;
      }

      const cloudOk = await upsertUserFinancialPayload(
        payloadUserId,
        finalMerged as unknown as Record<string, unknown>,
      );
      if (!cloudOk) {
        setBrainSyncError("No se pudo subir el presupuesto fusionado a la nube.");
        return false;
      }

      d.importFullState(finalMerged, { skipCloudHook: true });
      dedupeBudgetConceptsInDb(d);
      setBrainSnapshotUpdatedAt(new Date().toISOString());
      refresh();
      return true;
    },
    [refresh],
  );

  const syncBrainFromCloud = useCallback(async (): Promise<boolean> => {
    const { row, error } = await fetchBrainSnapshot();
    if (error) {
      setBrainSyncError(error);
      return false;
    }
    if (!row?.payload || !isFinancialPersistedData(row.payload)) {
      setBrainSyncError(
        "No hay snapshot del brain en la nube. Corre sync:brain una vez o importa CSV.",
      );
      return false;
    }
    const ok = await applyBrainPayloadMerge(row.payload, row.source ?? "csv");
    if (ok) await refreshBrainSnapshotMeta();
    return ok;
  }, [applyBrainPayloadMerge, refreshBrainSnapshotMeta]);

  const importBrainCsv = useCallback(
    async (files: File[]): Promise<boolean> => {
      try {
        const parsed = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            text: await file.text(),
          })),
        );
        const partial = brainCsvInputsFromFiles(parsed);
        if (!validateBrainCsvInputs(partial)) {
          setBrainSyncError(
            "Faltan archivos requeridos: presupuesto-mensual.csv y transacciones.csv.",
          );
          return false;
        }
        const { payload } = buildPayloadFromBrainCsv(partial as BrainCsvInputs);
        return applyBrainPayloadMerge(payload, "app_import");
      } catch (error) {
        console.error("[Brain] importBrainCsv:", error);
        setBrainSyncError("No se pudieron leer los archivos CSV.");
        return false;
      }
    },
    [applyBrainPayloadMerge],
  );

  const mergeRemote = useCallback(
    async (uid: string) => {
      const d = dbRef.current;
      const payloadUserId = resolveCloudPayloadUserId(uid);
      if (!d || !payloadUserId) {
        setCloudHydrated(true);
        return;
      }

      setCloudSyncError(null);

      if (!(HOUSEHOLD_MEMBER_IDS as readonly string[]).includes(uid)) {
        setCloudSyncError(
          "Tu cuenta no es una de las dos del hogar. No verás el presupuesto del brain.",
        );
        setCloudHydrated(true);
        return;
      }

      try {
        const { row, error } = await fetchUserFinancialPayload(payloadUserId);
        if (error) {
          setCloudSyncError(error);
          setCloudHydrated(true);
          return;
        }

        const localMs = d.getLastUpdateMs();
        const remoteMs = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
        const remotePayload = row?.payload;
        const localLeafConcepts = getBudgetConcepts(d).filter((c) => !c.isParent).length;
        const localTxCount = d.getTransactions().length;

        if (remotePayload && isFinancialPersistedData(remotePayload)) {
          const localPayload = d.exportFullStateObject() as FinancialPersistedData;
          const merged = mergeFinancialPayloads(localPayload, remotePayload);
          d.importFullState(merged, { skipCloudHook: true });
          dedupeBudgetConceptsInDb(d);

          const mergedJson = JSON.stringify(merged);
          const remoteJson = JSON.stringify(remotePayload);
          const localJson = JSON.stringify(localPayload);
          if (mergedJson !== remoteJson || localMs >= remoteMs || localJson !== mergedJson) {
            await runCloudSync("merge-unified");
          }
        } else if (localLeafConcepts === 0 && localTxCount === 0) {
          setCloudSyncError(
            "No hay presupuesto en la nube todavía. Hay que subir el brain (sync) una vez.",
          );
        } else if (localMs > 0 && getBudgetConcepts(d).some((c) => !c.isParent)) {
          await runCloudSync("bootstrap-backup");
        }
      } finally {
        setCloudHydrated(true);
        void refreshBrainSnapshotMeta();
      }
    },
    [runCloudSync, refreshBrainSnapshotMeta],
  );

  const reloadFromCloud = useCallback(() => {
    clearLocalFinanceStorage();
    window.location.href = "/inicio";
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const uid = data.session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) void mergeRemote(uid);
      else setCloudHydrated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) {
        setCloudHydrated(false);
        void mergeRemote(uid);
      } else {
        setCloudHydrated(true);
        setCloudSyncError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [mergeRemote]);

  const value = useMemo(
    () => ({
      db,
      transactions,
      selectedPeriod,
      setSelectedPeriod,
      refresh,
      userId,
      cloudHydrated,
      cloudSyncError,
      brainSyncError,
      brainSnapshotUpdatedAt,
      reloadFromCloud,
      syncBrainFromCloud,
      importBrainCsv,
      refreshBrainSnapshotMeta,
    }),
    [
      db,
      transactions,
      selectedPeriod,
      refresh,
      userId,
      cloudHydrated,
      cloudSyncError,
      brainSyncError,
      brainSnapshotUpdatedAt,
      reloadFromCloud,
      syncBrainFromCloud,
      importBrainCsv,
      refreshBrainSnapshotMeta,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
