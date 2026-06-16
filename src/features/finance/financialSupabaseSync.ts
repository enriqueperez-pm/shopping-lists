import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FinancialPersistedData } from "./FinancialDatabase";
import { BRAIN_SNAPSHOT_ID, type BrainSnapshotRow } from "./brain-sync";

export type FinancialPayloadRow = {
  user_id: string;
  payload: Record<string, unknown>;
  updated_at: string;
};

export type FetchPayloadResult = {
  row: FinancialPayloadRow | null;
  error: string | null;
};

export type BrainSnapshotFetchResult = {
  row: BrainSnapshotRow | null;
  error: string | null;
};

export async function fetchUserFinancialPayload(
  userId: string
): Promise<FetchPayloadResult> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { row: null, error: "Supabase no configurado" };

  const { data, error } = await supabase
    .from('user_financial_payload')
    .select('user_id, payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] fetchUserFinancialPayload:', error.message);
    return { row: null, error: error.message };
  }
  return { row: data as FinancialPayloadRow | null, error: null };
}

export async function upsertUserFinancialPayload(
  userId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const supabase = getBrowserSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('user_financial_payload').upsert(
    {
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[Supabase] upsertUserFinancialPayload:', error.message);
    return false;
  }
  return true;
}

export async function fetchBrainSnapshot(): Promise<BrainSnapshotFetchResult> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { row: null, error: "Supabase no configurado" };

  const { data, error } = await supabase
    .from("brain_financial_snapshot")
    .select("id, payload, source, updated_at")
    .eq("id", BRAIN_SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] fetchBrainSnapshot:", error.message);
    return { row: null, error: error.message };
  }

  if (!data?.payload) return { row: null, error: null };

  return {
    row: {
      id: data.id,
      payload: data.payload as FinancialPersistedData,
      source: (data.source as BrainSnapshotRow["source"]) ?? "csv",
      updated_at: data.updated_at,
    },
    error: null,
  };
}

export async function upsertBrainSnapshot(
  payload: FinancialPersistedData,
  source: BrainSnapshotRow["source"] = "csv",
): Promise<boolean> {
  const supabase = getBrowserSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("brain_financial_snapshot").upsert(
    {
      id: BRAIN_SNAPSHOT_ID,
      payload,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[Supabase] upsertBrainSnapshot:", error.message);
    return false;
  }
  return true;
}
