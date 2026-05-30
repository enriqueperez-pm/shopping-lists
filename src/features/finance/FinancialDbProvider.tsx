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
  isFinancialPersistedData,
  type EnhancedTransaction,
} from "./FinancialDatabase";
import { fetchUserFinancialPayload, upsertUserFinancialPayload } from "./financialSupabaseSync";
import { ensureBaselineBudgetTaxonomy } from "./finance-linking";
import { setFinanceDb } from "./finance-bridge";
import { resolveCloudPayloadUserId } from "@/lib/household";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type FinanceContextValue = {
  db: FinancialDatabase;
  transactions: EnhancedTransaction[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  refresh: () => void;
  userId: string | null;
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
  const userIdRef = useRef<string | null>(null);
  const dbRef = useRef<FinancialDatabase | null>(null);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudSyncInFlightRef = useRef(false);
  const cloudSyncDirtyRef = useRef(false);

  const [db] = useState(() => {
    const inst = new FinancialDatabase({
      onAfterSave: () => {
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
    setTransactions(db.getTransactions(selectedPeriod));
  }, [db, selectedPeriod]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const mergeRemote = async (uid: string) => {
      const d = dbRef.current;
      const payloadUserId = resolveCloudPayloadUserId(uid);
      if (!d || !payloadUserId) return;
      const row = await fetchUserFinancialPayload(payloadUserId);
      const localMs = d.getLastUpdateMs();
      const remoteMs = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
      const remotePayload = row?.payload;
      if (remotePayload && isFinancialPersistedData(remotePayload)) {
        if (remoteMs > localMs) {
          d.importFullState(remotePayload, { skipCloudHook: true });
          refresh();
        } else if (remoteMs < localMs) {
          await runCloudSync("merge-local-newer");
        }
      } else {
        await runCloudSync("bootstrap-backup");
      }
    };

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const uid = data.session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) void mergeRemote(uid);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) void mergeRemote(uid);
    });

    return () => subscription.unsubscribe();
  }, [refresh, runCloudSync]);

  const value = useMemo(
    () => ({ db, transactions, selectedPeriod, setSelectedPeriod, refresh, userId }),
    [db, transactions, selectedPeriod, refresh, userId],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
