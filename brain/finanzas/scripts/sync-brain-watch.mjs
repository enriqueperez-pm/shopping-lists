#!/usr/bin/env node
/**
 * Sync continuo brain CSV ↔ Supabase (tiempo casi real en Drive).
 *
 * - Si la app/CLI sube cambios a la nube → exporta CSV locales.
 * - Si editas CSV en Drive → sube a Supabase y fusiona.
 *
 * Usage: node brain/finanzas/scripts/sync-brain-watch.mjs
 *        npm run sync:brain:watch
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runBrainSync } from "./sync-to-cloud.mjs";
import { exportPayloadToBrain } from "./payload-to-brain.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const KLAGI_ROOT = path.resolve(__dirname, "../../../app/klagi");
const STATE_FILE = path.join(DATA_DIR, ".sync-watch-state.json");

const POLL_MS = Number(process.env.BRAIN_WATCH_POLL_MS || 12000);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

function loadEnv() {
  loadEnvFile(path.join(KLAGI_ROOT, ".env.local"));
}

function normalizeUrl(input) {
  return input.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

async function signInHousehold(baseUrl, anonKey, email, password) {
  const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.message || res.statusText);
  return data.access_token;
}

async function supabaseGet(baseUrl, anonKey, bearer, resource) {
  const res = await fetch(`${baseUrl}/rest/v1/${resource}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { lastCloudMs: 0, lastCsvMs: 0 };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function csvLatestMtime() {
  const files = ["presupuesto-mensual.csv", "ingresos-mensual.csv", "transacciones.csv"];
  let max = 0;
  for (const name of files) {
    const p = path.join(DATA_DIR, name);
    if (!fs.existsSync(p)) continue;
    const ms = fs.statSync(p).mtimeMs;
    if (ms > max) max = ms;
  }
  return max;
}

function exportCloudToCsv(payload) {
  exportPayloadToBrain(payload);
  console.log(`[watch] CSV exportados desde nube (${new Date().toLocaleTimeString("es-MX")})`);
}

async function fetchCloudTimestamps(baseUrl, anonKey, bearer, userId) {
  const [payloadRows, snapshotRows] = await Promise.all([
    supabaseGet(
      baseUrl,
      anonKey,
      bearer,
      `user_financial_payload?user_id=eq.${userId}&select=updated_at,payload`,
    ),
    supabaseGet(
      baseUrl,
      anonKey,
      bearer,
      `brain_financial_snapshot?id=eq.household&select=updated_at,source`,
    ),
  ]);

  const payloadRow = Array.isArray(payloadRows) ? payloadRows[0] : null;
  const snapshotRow = Array.isArray(snapshotRows) ? snapshotRows[0] : null;
  const payloadMs = payloadRow?.updated_at ? new Date(payloadRow.updated_at).getTime() : 0;
  const snapshotMs = snapshotRow?.updated_at ? new Date(snapshotRow.updated_at).getTime() : 0;

  return {
    cloudMs: Math.max(payloadMs, snapshotMs),
    payload: payloadRow?.payload ?? null,
    snapshotSource: snapshotRow?.source ?? null,
  };
}

async function tick() {
  loadEnv();
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const email = (process.env.SUPABASE_SYNC_EMAIL ?? "").trim();
  const password = (process.env.SUPABASE_SYNC_PASSWORD ?? "").trim();
  const userId = "71aa401e-ad23-4413-b72e-5e17c62bb507";

  if (!url || !anonKey || !email || !password) {
    console.error("[watch] Falta .env.local (Supabase + SUPABASE_SYNC_EMAIL/PASSWORD)");
    process.exit(1);
  }

  const bearer = await signInHousehold(url, anonKey, email, password);
  const state = readState();
  const csvMs = csvLatestMtime();
  const { cloudMs, payload, snapshotSource } = await fetchCloudTimestamps(
    url,
    anonKey,
    bearer,
    userId,
  );

  if (csvMs > state.lastCsvMs + 500 && csvMs > cloudMs - 2000) {
    console.log("[watch] CSV locales cambiaron → subiendo a Supabase");
    await runBrainSync(["node", "sync-brain-watch"]);
    state.lastCsvMs = csvLatestMtime();
    state.lastCloudMs = Date.now();
    writeState(state);
    return;
  }

  if (cloudMs > state.lastCloudMs + 500 && payload) {
    if (snapshotSource === "app" || cloudMs > csvMs) {
      exportCloudToCsv(payload);
      state.lastCloudMs = cloudMs;
      state.lastCsvMs = csvLatestMtime();
      writeState(state);
    }
  }
}

async function main() {
  console.log(`[watch] Sync brain ↔ nube cada ${POLL_MS / 1000}s (Ctrl+C para salir)`);
  console.log(`[watch] CSV: ${DATA_DIR}`);

  await tick();
  setInterval(() => {
    tick().catch((err) => console.error("[watch]", err.message));
  }, POLL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
