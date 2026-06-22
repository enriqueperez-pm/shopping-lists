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
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import {
  FinancialDatabase,
  clearLocalFinanceStorage,
  isFinancialPersistedData,
  type EnhancedTransaction,
  type FinancialPersistedData,
} from "./FinancialDatabase";
import {
  fetchUserFinancialPayload,
  upsertUserFinancialPayload,
  fetchBrainSnapshot,
  upsertBrainSnapshot,
} from "./financialSupabaseSync";
import { payloadsEqual, reconcileFinancialState } from "./financialReconcile";
import {
  buildPayloadFromBrainCsv,
  brainCsvInputsFromFiles,
  validateBrainCsvInputs,
  type BrainCsvInputs,
} from "./brain-sync";
import {
  ensureBaselineBudgetTaxonomy,
  ensureBaselineIncomeConcepts,
  ensurePeriodConceptHierarchy,
  repairBudgetHierarchyInDb,
  getBudgetConcepts,
} from "./finance-linking";
import { repairLegacyEnglishTaxonomy } from "./finance-crud";
import { setFinanceDb } from "./finance-bridge";
import { HOUSEHOLD_MEMBER_IDS, HOUSEHOLD_PAYLOAD_USER_ID, resolveCloudPayloadUserId } from "@/lib/household";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type FinanceContextValue = {
  db: FinancialDatabase;
  transactions: EnhancedTransaction[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  refresh: () => void;
  userId: string | null;
  isHouseholdMember: boolean;
  cloudHydrated: boolean;
  cloudSyncError: string | null;
  brainSyncError: string | null;
  brainSnapshotUpdatedAt: string | null;
  lastCloudSyncAt: string | null;
  reloadFromCloud: () => void;
  pushToCloud: () => Promise<boolean>;
  saveAndSyncAll: () => Promise<boolean>;
  isSyncDirty: boolean;
  syncInFlight: boolean;
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
  const [selectedPeriod, setSelectedPeriodState] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [brainSyncError, setBrainSyncError] = useState<string | null>(null);
  const [brainSnapshotUpdatedAt, setBrainSnapshotUpdatedAt] = useState<string | null>(null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const [isSyncDirty, setIsSyncDirty] = useState(false);
  const [syncInFlight, setSyncInFlight] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const dbRef = useRef<FinancialDatabase | null>(null);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncInFlightRef = useRef(false);
  const reconcileInFlightRef = useRef(false);
  const cloudSyncDirtyRef = useRef(false);
  const lastLocalPushMsRef = useRef(0);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const lastRemoteCloudMsRef = useRef(0);

  const [db] = useState(() => {
    const inst = new FinancialDatabase({
      onAfterSave: () => {
        if (!cloudHydrated) return;
        cloudSyncDirtyRef.current = true;
        setIsSyncDirty(true);
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
    repairBudgetHierarchyInDb(db, selectedPeriod);
    repairLegacyEnglishTaxonomy(db);
    setTransactions(db.getTransactions(selectedPeriod));
  }, [db, selectedPeriod]);

  const setSelectedPeriod = useCallback(
    (period: string) => {
      setSelectedPeriodState(period);
      const prefs = db.getUserPreferences();
      db.setUserPreferences({ ...prefs, selectedPeriod: period });
    },
    [db],
  );

  useEffect(() => {
    if (!cloudHydrated) return;
    refresh();
  }, [refresh, cloudHydrated]);

  useEffect(() => {
    if (!cloudHydrated) return;
    const period = db.getUserPreferences().selectedPeriod;
    if (period) setSelectedPeriodState(period);
  }, [cloudHydrated, db]);

  const pushMergedToCloud = useCallback(
    async (
      payloadUserId: string,
      merged: FinancialPersistedData,
      options?: { applyLocalMerge?: boolean; localPayload?: FinancialPersistedData },
    ): Promise<boolean> => {
      const d = dbRef.current;

      const snapshotOk = await upsertBrainSnapshot(merged, "app");
      if (!snapshotOk) {
        setBrainSyncError("No se pudo guardar el snapshot del brain.");
        return false;
      }

      const cloudOk = await upsertUserFinancialPayload(
        payloadUserId,
        merged as unknown as Record<string, unknown>,
      );
      if (!cloudOk) {
        setCloudSyncError("No se pudo subir a la nube.");
        return false;
      }

      if (
        options?.applyLocalMerge &&
        d &&
        options.localPayload &&
        !payloadsEqual(options.localPayload, merged)
      ) {
        d.importFullState(merged, { skipCloudHook: true });
        repairBudgetHierarchyInDb(d);
        repairLegacyEnglishTaxonomy(d);
        refresh();
      }

      const now = new Date().toISOString();
      cloudSyncDirtyRef.current = false;
      setIsSyncDirty(false);
      lastLocalPushMsRef.current = Date.now();
      setLastCloudSyncAt(now);
      setBrainSnapshotUpdatedAt(now);
      setBrainSyncError(null);
      setCloudSyncError(null);

      if (d) {
        const prefs = d.getUserPreferences();
        d.setUserPreferences({ ...prefs, lastCloudSyncAck: now });
      }

      return true;
    },
    [refresh],
  );

  const runCloudSync = useCallback(async (reason: string = "sync") => {
    if (cloudSyncInFlightRef.current) return false;
    const d = dbRef.current;
    const uid = userIdRef.current;
    const payloadUserId = resolveCloudPayloadUserId(uid);
    if (!d || !payloadUserId) {
      setCloudSyncError("Inicia sesión con la cuenta del hogar para sincronizar.");
      return false;
    }
    if (!isSupabaseConfigured()) {
      setCloudSyncError("Supabase no está configurado.");
      return false;
    }
    cloudSyncInFlightRef.current = true;
    setSyncInFlight(true);
    try {
      d.captureModuleDataFromLocalStorage({ persist: true });
      const localPayload = d.exportFullStateObject() as FinancialPersistedData;

      const [{ row: remoteRow, error: remoteError }, { row: brainRow }] = await Promise.all([
        fetchUserFinancialPayload(payloadUserId),
        fetchBrainSnapshot(),
      ]);

      if (remoteError) {
        setCloudSyncError(remoteError);
        return false;
      }

      const remotePayload =
        remoteRow?.payload && isFinancialPersistedData(remoteRow.payload)
          ? remoteRow.payload
          : null;
      const brainPayload =
        brainRow?.payload && isFinancialPersistedData(brainRow.payload)
          ? brainRow.payload
          : null;

      const merged = reconcileFinancialState(localPayload, remotePayload, brainPayload);

      if (!payloadsEqual(localPayload, merged)) {
        d.importFullState(merged, { skipCloudHook: true });
        repairBudgetHierarchyInDb(d);
        repairLegacyEnglishTaxonomy(d);
        const prefs = d.getUserPreferences();
        if (prefs.selectedPeriod) setSelectedPeriodState(prefs.selectedPeriod);
        refresh();
      }

      return pushMergedToCloud(payloadUserId, merged);
    } catch (error) {
      console.error(`[Supabase] Sync error (${reason}):`, error);
      cloudSyncDirtyRef.current = true;
      setIsSyncDirty(true);
      setCloudSyncError("Error al sincronizar con la nube.");
      return false;
    } finally {
      cloudSyncInFlightRef.current = false;
      setSyncInFlight(false);
    }
  }, [pushMergedToCloud, refresh]);

  const refreshBrainSnapshotMeta = useCallback(async () => {
    const { row, error } = await fetchBrainSnapshot();
    if (error) {
      setBrainSyncError(error);
      return;
    }
    setBrainSnapshotUpdatedAt(row?.updated_at ?? null);
    if (row) setBrainSyncError(null);
  }, []);

  const pullFromCloud = useCallback(
    async (options?: { skipIfRecentLocalPush?: boolean; pushIfLocalNewer?: boolean }) => {
      if (reconcileInFlightRef.current) return false;
      const d = dbRef.current;
      const uid = userIdRef.current;
      const payloadUserId = resolveCloudPayloadUserId(uid);
      if (!d || !payloadUserId || !isSupabaseConfigured()) return false;

      if (
        options?.skipIfRecentLocalPush &&
        Date.now() - lastLocalPushMsRef.current < 2500
      ) {
        return false;
      }

      reconcileInFlightRef.current = true;
      try {
        const [{ row: remoteRow, error: remoteError }, { row: brainRow, error: brainError }] =
          await Promise.all([
            fetchUserFinancialPayload(payloadUserId),
            fetchBrainSnapshot(),
          ]);

        if (remoteError) {
          setCloudSyncError(remoteError);
          return false;
        }
        if (brainError) setBrainSyncError(brainError);

        const remoteMs = remoteRow?.updated_at
          ? new Date(remoteRow.updated_at).getTime()
          : 0;
        const brainMs = brainRow?.updated_at ? new Date(brainRow.updated_at).getTime() : 0;
        const cloudMs = Math.max(remoteMs, brainMs);

        if (cloudMs <= lastRemoteCloudMsRef.current && !options?.pushIfLocalNewer) {
          return false;
        }

        const remotePayload =
          remoteRow?.payload && isFinancialPersistedData(remoteRow.payload)
            ? remoteRow.payload
            : null;
        const brainPayload =
          brainRow?.payload && isFinancialPersistedData(brainRow.payload)
            ? brainRow.payload
            : null;

        const localPayload = d.exportFullStateObject() as FinancialPersistedData;
        const merged = reconcileFinancialState(localPayload, remotePayload, brainPayload);

        if (!payloadsEqual(localPayload, merged)) {
          d.importFullState(merged, { skipCloudHook: true });
          repairBudgetHierarchyInDb(d);
          repairLegacyEnglishTaxonomy(d);
          const prefs = d.getUserPreferences();
          if (prefs.selectedPeriod) setSelectedPeriodState(prefs.selectedPeriod);
          refresh();
        }

        lastRemoteCloudMsRef.current = cloudMs;
        if (brainRow?.updated_at) setBrainSnapshotUpdatedAt(brainRow.updated_at);
        if (remoteRow?.updated_at) setLastCloudSyncAt(remoteRow.updated_at);
        setBrainSyncError(null);
        setCloudSyncError(null);

        if (options?.pushIfLocalNewer) {
          const localMs = d.getLastUpdateMs();
          if (localMs > cloudMs) {
            await runCloudSync("local-newer");
          }
        }

        return true;
      } finally {
        reconcileInFlightRef.current = false;
      }
    },
    [refresh, runCloudSync],
  );

  const schedulePullFromCloud = useCallback(() => {
    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = setTimeout(() => {
      void pullFromCloud({ skipIfRecentLocalPush: true });
    }, 600);
  }, [pullFromCloud]);

  const applyBrainPayloadMerge = useCallback(
    async (
      brainPayload: FinancialPersistedData,
      snapshotSource: "csv" | "app_import" | "cli" | "app",
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

      const localPayload = d.exportFullStateObject() as FinancialPersistedData;
      const finalMerged = reconcileFinancialState(localPayload, remotePayload, brainPayload);

      const snapshotOk = await upsertBrainSnapshot(brainPayload, snapshotSource);
      if (!snapshotOk) {
        setBrainSyncError("No se pudo guardar el snapshot del brain en la nube.");
        return false;
      }

      const now = new Date().toISOString();
      const cloudOk = await upsertUserFinancialPayload(
        payloadUserId,
        finalMerged as unknown as Record<string, unknown>,
      );
      if (!cloudOk) {
        setBrainSyncError("No se pudo subir el presupuesto fusionado a la nube.");
        return false;
      }

      lastLocalPushMsRef.current = Date.now();
      d.importFullState(finalMerged, { skipCloudHook: true });
      repairBudgetHierarchyInDb(d);
      setBrainSnapshotUpdatedAt(now);
      setLastCloudSyncAt(now);
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
        await pullFromCloud({ pushIfLocalNewer: true });
      } finally {
        setCloudHydrated(true);
        void refreshBrainSnapshotMeta();
      }
    },
    [pullFromCloud, refreshBrainSnapshotMeta],
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
        if (realtimeChannelRef.current) {
          void supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [mergeRemote]);

  useEffect(() => {
    if (!cloudHydrated || !userId || !isSupabaseConfigured()) return;
    if (!(HOUSEHOLD_MEMBER_IDS as readonly string[]).includes(userId)) return;

    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel("finance-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_financial_payload",
          filter: `user_id=eq.${HOUSEHOLD_PAYLOAD_USER_ID}`,
        },
        () => schedulePullFromCloud(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brain_financial_snapshot",
          filter: "id=eq.household",
        },
        () => schedulePullFromCloud(),
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [cloudHydrated, userId, schedulePullFromCloud]);

  const saveAndSyncAll = useCallback(async (): Promise<boolean> => {
    const d = dbRef.current;
    const uid = userIdRef.current;
    const payloadUserId = resolveCloudPayloadUserId(uid);
    if (!d || !payloadUserId) {
      setCloudSyncError("Inicia sesión con la cuenta del hogar para sincronizar.");
      return false;
    }
    if (!isSupabaseConfigured()) {
      setCloudSyncError("Supabase no está configurado.");
      return false;
    }

    setSyncInFlight(true);
    try {
      d.captureModuleDataFromLocalStorage({ persist: true });
      repairLegacyEnglishTaxonomy(d);
      repairBudgetHierarchyInDb(d);

      const localPayload = d.exportFullStateObject() as FinancialPersistedData;

      const [{ row: remoteRow, error: remoteError }, { row: brainRow }] = await Promise.all([
        fetchUserFinancialPayload(payloadUserId),
        fetchBrainSnapshot(),
      ]);

      if (remoteError) {
        setCloudSyncError(remoteError);
        return false;
      }

      const remotePayload =
        remoteRow?.payload && isFinancialPersistedData(remoteRow.payload)
          ? remoteRow.payload
          : null;
      const brainPayload =
        brainRow?.payload && isFinancialPersistedData(brainRow.payload)
          ? brainRow.payload
          : null;

      const merged = reconcileFinancialState(localPayload, remotePayload, brainPayload);

      const ok = await pushMergedToCloud(payloadUserId, merged, {
        applyLocalMerge: true,
        localPayload,
      });
      if (!ok) {
        cloudSyncDirtyRef.current = true;
        setIsSyncDirty(true);
      }
      return ok;
    } catch (error) {
      console.error("[Supabase] saveAndSyncAll:", error);
      cloudSyncDirtyRef.current = true;
      setIsSyncDirty(true);
      setCloudSyncError("Error al subir a la nube.");
      return false;
    } finally {
      setSyncInFlight(false);
    }
  }, [pushMergedToCloud]);

  const pushToCloud = useCallback(async (): Promise<boolean> => {
    return saveAndSyncAll();
  }, [saveAndSyncAll]);

  const isHouseholdMember = Boolean(
    userId && (HOUSEHOLD_MEMBER_IDS as readonly string[]).includes(userId),
  );

  const value = useMemo(
    () => ({
      db,
      transactions,
      selectedPeriod,
      setSelectedPeriod,
      refresh,
      userId,
      isHouseholdMember,
      cloudHydrated,
      cloudSyncError,
      brainSyncError,
      brainSnapshotUpdatedAt,
      lastCloudSyncAt,
      reloadFromCloud,
      pushToCloud,
      saveAndSyncAll,
      isSyncDirty,
      syncInFlight,
      syncBrainFromCloud,
      importBrainCsv,
      refreshBrainSnapshotMeta,
    }),
    [
      db,
      transactions,
      selectedPeriod,
      setSelectedPeriod,
      refresh,
      userId,
      isHouseholdMember,
      cloudHydrated,
      cloudSyncError,
      brainSyncError,
      brainSnapshotUpdatedAt,
      lastCloudSyncAt,
      reloadFromCloud,
      pushToCloud,
      saveAndSyncAll,
      isSyncDirty,
      syncInFlight,
      syncBrainFromCloud,
      importBrainCsv,
      refreshBrainSnapshotMeta,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
