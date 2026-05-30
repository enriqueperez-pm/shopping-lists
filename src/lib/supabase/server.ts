import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function normalizeSupabaseUrl(input: string): string {
  const cleaned = input.trim().replace(/\/+$/, "");
  return cleaned.replace(/\/rest\/v1$/i, "");
}

export async function createClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

  return createServerClient(normalizeSupabaseUrl(rawUrl), key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component — ignore */
        }
      },
    },
  });
}
