import { getBrowserSupabase } from "@/lib/supabase/client";

export type FinancialPayloadRow = {
  user_id: string;
  payload: Record<string, unknown>;
  updated_at: string;
};

export type FetchPayloadResult = {
  row: FinancialPayloadRow | null;
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
