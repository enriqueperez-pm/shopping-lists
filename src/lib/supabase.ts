import { createClient } from "@supabase/supabase-js";

// Gracefully handle missing env vars during build (static generation).
// At runtime in the browser these will always be set.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

/**
 * Accept both:
 * - Project URL: https://<ref>.supabase.co
 * - Data API URL: https://<ref>.supabase.co/rest/v1
 * Supabase client expects project URL and adds /rest/v1 internally.
 */
function normalizeSupabaseUrl(input: string): string {
  const cleaned = input.trim().replace(/\/+$/, "");
  return cleaned.replace(/\/rest\/v1$/i, "");
}

const url = normalizeSupabaseUrl(rawUrl);

export const supabase = createClient(url, key);
