import { createBrowserClient } from "@supabase/ssr";

function normalizeSupabaseUrl(input: string): string {
  const cleaned = input.trim().replace(/\/+$/, "");
  return cleaned.replace(/\/rest\/v1$/i, "");
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";
  return createBrowserClient(normalizeSupabaseUrl(rawUrl), key);
}

/** Singleton for hooks and client components */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"),
  );
}
