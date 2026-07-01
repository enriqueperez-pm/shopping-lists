#!/usr/bin/env node
/** Smoke test post-sync: auth + finanzas + compras */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KLAGI_ROOT = path.resolve(__dirname, "..");

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

loadEnvFile(path.join(KLAGI_ROOT, ".env.local"));
loadEnvFile(path.join(KLAGI_ROOT, ".env.local.example"));

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const email = (process.env.SUPABASE_SYNC_EMAIL ?? "").trim();
const password = (process.env.SUPABASE_SYNC_PASSWORD ?? "").trim();
const HOUSEHOLD_ID = "71aa401e-ad23-4413-b72e-5e17c62bb507";

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || res.statusText);
  return data.access_token;
}

async function get(token, resource) {
  const res = await fetch(`${url}/rest/v1/${resource}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS ${name}: ${detail}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL ${name}: ${detail}`);
}

async function main() {
  const token = await signIn();
  pass("auth_login", "UUID hogar OK");

  const payload = await get(token, `user_financial_payload?user_id=eq.${HOUSEHOLD_ID}&select=payload,updated_at`);
  if (!payload.ok || !payload.data?.[0]) {
    fail("finanzas_payload", `status ${payload.status}`);
  } else {
    const txs = payload.data[0].payload?.transactions ?? [];
    const june = txs.filter((t) => (t.date ?? "").startsWith("2026-06"));
    const july = txs.filter((t) => (t.date ?? "").startsWith("2026-07"));
    const mpRecent = txs.filter((t) => (t.date ?? "") >= "2026-06-27");
    pass("finanzas_payload", `${txs.length} txs; jun=${june.length} jul=${july.length}; recientes>=27jun=${mpRecent.length}`);
    if (mpRecent.length < 10) fail("mp_movimientos", `solo ${mpRecent.length} desde 27-jun`);
    else pass("mp_movimientos", `${mpRecent.length} movimientos MP recientes`);
  }

  const products = await get(token, "products?select=id,name&limit=5");
  if (!products.ok || !products.data?.length) fail("compras_productos", `status ${products.status}`);
  else pass("compras_productos", `${products.data.length}+ productos visibles`);

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) process.exit(1);
  console.log("\nSmoke test OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
