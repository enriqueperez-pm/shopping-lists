import { createClient } from "@supabase/supabase-js";

// Gracefully handle missing env vars during build (static generation).
// At runtime in the browser these will always be set.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(url, key);
