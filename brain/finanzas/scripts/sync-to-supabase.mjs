#!/usr/bin/env node
/**
 * Sync brain/finanzas/data/*.csv → Supabase user_financial_payload
 *
 * Usage (from app/klagi):
 *   node ../../brain/finanzas/scripts/sync-to-supabase.mjs
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (required for write; or use --export-only)
 */
import fs from "fs";
import path from "path";
import {
  buildPayloadFromBrain,
  mergeWithRemotePayload,
  HOUSEHOLD_PAYLOAD_USER_ID,
} from "./brain-to-payload.mjs";

const exportOnly = process.argv.includes("--export-only");

function normalizeUrl(input) {
  return input.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const klagiRoot = path.resolve(import.meta.dirname, "../../../app/klagi");
loadEnvFile(path.join(klagiRoot, ".env.local"));
loadEnvFile(path.join(klagiRoot, ".env.local.example"));

const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const { payload: brainPayload, stats } = buildPayloadFromBrain();
const outDir = path.resolve(import.meta.dirname, "../data");
const exportPath = path.join(outDir, "sync-payload-export.json");
fs.writeFileSync(exportPath, JSON.stringify(brainPayload, null, 2), "utf8");

console.log("Brain → payload");
console.log(`  conceptos: ${stats.concepts}`);
console.log(`  transacciones: ${stats.transactions}`);
console.log(`  deudas: ${stats.debts}`);
console.log(`  periodos: ${stats.periods.join(", ")}`);
console.log(`  export: ${exportPath}`);

if (exportOnly) {
  const sqlPath = path.join(outDir, "sync-payload-upsert.sql");
  const jsonEsc = JSON.stringify(brainPayload).replace(/'/g, "''");
  fs.writeFileSync(
    sqlPath,
    `-- Run in Supabase SQL Editor\nINSERT INTO public.user_financial_payload (user_id, payload, updated_at)\nVALUES ('${HOUSEHOLD_PAYLOAD_USER_ID}'::uuid, '${jsonEsc}'::jsonb, now())\nON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();\n`,
    "utf8",
  );
  console.log(`  sql: ${sqlPath}`);
  console.log("\n--export-only: no Supabase upsert.");
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");

if (!url) {
  console.error("\nMissing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const key = serviceKey || anonKey;
if (!key) {
  console.error("\nMissing SUPABASE_SERVICE_ROLE_KEY (or anon key).");
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in app/klagi/.env.local and re-run.");
  console.error(`Or paste ${exportPath} via SQL Editor (see procedimientos/sync-supabase.md).`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let remotePayload = null;
const { data: row, error: fetchErr } = await supabase
  .from("user_financial_payload")
  .select("payload")
  .eq("user_id", HOUSEHOLD_PAYLOAD_USER_ID)
  .maybeSingle();

if (fetchErr) {
  console.warn("Fetch remote (continuing with brain only):", fetchErr.message);
} else if (row?.payload) {
  remotePayload = row.payload;
  console.log("\nRemote payload found — merging shopping trips + other periods.");
}

const finalPayload = mergeWithRemotePayload(brainPayload, remotePayload);

const { error: upsertErr } = await supabase.from("user_financial_payload").upsert(
  {
    user_id: HOUSEHOLD_PAYLOAD_USER_ID,
    payload: finalPayload,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" },
);

if (upsertErr) {
  console.error("\nUpsert failed:", upsertErr.message);
  if (!serviceKey) {
    console.error(
      "Anon key cannot write user_financial_payload. Add SUPABASE_SERVICE_ROLE_KEY to .env.local",
    );
  }
  const sqlPath = path.join(outDir, "sync-payload-upsert.sql");
  const jsonEsc = JSON.stringify(finalPayload).replace(/'/g, "''");
  fs.writeFileSync(
    sqlPath,
    `-- Run in Supabase SQL Editor\nINSERT INTO public.user_financial_payload (user_id, payload, updated_at)\nVALUES ('${HOUSEHOLD_PAYLOAD_USER_ID}'::uuid, '${jsonEsc}'::jsonb, now())\nON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();\n`,
    "utf8",
  );
  console.error(`SQL fallback written: ${sqlPath}`);
  process.exit(1);
}

console.log("\nSync OK → Supabase user_financial_payload");
console.log(`  user_id: ${HOUSEHOLD_PAYLOAD_USER_ID}`);
console.log("  Abre https://project-klagi.vercel.app/presupuesto (mes 2026-06)");
