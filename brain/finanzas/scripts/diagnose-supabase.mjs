#!/usr/bin/env node
/**
 * Diagnóstico remoto Supabase (requiere SUPABASE_SYNC_EMAIL/PASSWORD en app/klagi/.env.local)
 */
import { runBrainSync } from "./sync-to-cloud.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { HOUSEHOLD_PAYLOAD_USER_ID } from "./brain-to-payload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KLAGI_ROOT = path.resolve(__dirname, "../../../app/klagi");

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

function normalizeUrl(input) {
  return input.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

async function signIn(baseUrl, anonKey, email, password) {
  const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || res.statusText);
  return data.access_token;
}

async function main() {
  loadEnvFile(path.join(KLAGI_ROOT, ".env.local"));
  loadEnvFile(path.join(KLAGI_ROOT, ".env.local.example"));

  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const email = (process.env.SUPABASE_SYNC_EMAIL ?? "").trim();
  const password = (process.env.SUPABASE_SYNC_PASSWORD ?? "").trim();

  console.log("=== Diagnóstico Supabase ===\n");
  console.log(`Payload user_id: ${HOUSEHOLD_PAYLOAD_USER_ID}`);

  const exportPath = path.join(__dirname, "../data/sync-payload-export.json");
  if (fs.existsSync(exportPath)) {
    const local = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    const concepts = (local.moduleData?.budgetConcepts ?? []).filter((c) => !c.isParent).length;
    console.log(`Brain local export: ${concepts} conceptos, ${(local.transactions ?? []).length} transacciones`);
  }

  if (!email || !password) {
    console.log("\nSin SUPABASE_SYNC_EMAIL/PASSWORD — no se puede leer la nube autenticado.");
    console.log("Anon sin sesión devuelve [] por RLS (normal).");
    return 1;
  }

  const token = await signIn(url, anonKey, email, password);
  const res = await fetch(
    `${url}/rest/v1/user_financial_payload?user_id=eq.${HOUSEHOLD_PAYLOAD_USER_ID}&select=updated_at,payload`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
  );
  const rows = await res.json();
  if (!res.ok) {
    console.error("Fetch error:", rows);
    return 1;
  }

  if (!Array.isArray(rows) || !rows[0]) {
    console.log("\nRemoto: SIN FILA (vacío) → hay que subir brain (npm run sync:brain)");
    return 2;
  }

  const p = rows[0].payload ?? {};
  const concepts = (p.moduleData?.budgetConcepts ?? []).filter((c) => !c.isParent).length;
  const txs = (p.transactions ?? []).length;
  console.log(`\nRemoto OK @ ${rows[0].updated_at}`);
  console.log(`  conceptos: ${concepts}`);
  console.log(`  transacciones: ${txs}`);

  if (concepts < 10 || txs < 5) {
    console.log("\nRemoto incompleto → ejecutar npm run sync:brain");
    return 2;
  }

  console.log("\nRemoto parece correcto. Si la app muestra $0 → Recargar desde la nube (Cuenta).");
  return 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().then((code) => process.exit(code));
}

export { main as diagnoseSupabase };
