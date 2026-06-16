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
import { fetchUserFinancialPayload, upsertUserFinancialPayload } from "./financialSupabaseSync";
import { ensureBaselineBudgetTaxonomy, ensureBaselineIncomeConcepts, getBudgetConcepts } from "./finance-linking";
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
  reloadFromCloud: () => void;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinancialDbProvider");
  return ctx;
}

function countLeafConcepts(payload: FinancialPersistedData) {
  return (payload.moduleData?.budgetConcepts ?? []).filter(
    (c): c is { isParent?: boolean } =>
      typeof c === "object" && c !== null && !(c as { isParent?: boolean }).isParent,
  ).length;
}

export default function FinancialDbProvider({ children }: { children: ReactNode }) {
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
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
          const remoteLeafConcepts = countLeafConcepts(remotePayload);
          const remoteTxCount = remotePayload.transactions?.length ?? 0;

          const preferRemote =
            remoteMs > localMs ||
            remoteLeafConcepts > localLeafConcepts ||
            remoteTxCount > localTxCount ||
            (remoteLeafConcepts > 0 && localLeafConcepts === 0);

          if (preferRemote) {
            d.importFullState(remotePayload, { skipCloudHook: true });
          } else if (remoteMs < localMs && (localLeafConcepts > remoteLeafConcepts || localTxCount > remoteTxCount)) {
            await runCloudSync("merge-local-newer");
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
      }
    },
    [runCloudSync],
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
      reloadFromCloud,
    }),
    [db, transactions, selectedPeriod, refresh, userId, cloudHydrated, cloudSyncError, reloadFromCloud],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
