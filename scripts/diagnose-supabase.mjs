#!/usr/bin/env node
/**
 * Diagnóstico REST post-restauración (sin service role).
 * Complementa DIAGNOSTICO_POST_RESTORE.sql en el SQL Editor.
 */
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

async function rest(bearer, resource, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${resource}`, {
    method: opts.method ?? "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.message || res.statusText || "login failed");
  }
  return { token: data.access_token, userId: data.user?.id };
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  console.log("Diagnóstico Supabase klagi (REST)");
  console.log(`URL: ${url || "(missing)"}`);

  if (!url || !anonKey) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o ANON_KEY");
    process.exit(1);
  }

  section("Health check (anon)");
  const health = await fetch(`${url}/rest/v1/`, { headers: { apikey: anonKey } });
  console.log(`PostgREST: ${health.status} ${health.statusText}`);

  if (!email || !password) {
    console.error("\nFalta SUPABASE_SYNC_EMAIL/PASSWORD en .env.local — no se puede probar Auth.");
    process.exit(1);
  }

  section("Auth login");
  let token;
  let userId;
  try {
    ({ token, userId } = await signIn());
    console.log(`OK — user_id: ${userId}`);
    console.log(`UUID hogar esperado: ${HOUSEHOLD_ID} — ${userId === HOUSEHOLD_ID ? "MATCH" : "MISMATCH"}`);
  } catch (err) {
    console.error(`FAIL — ${err.message}`);
    process.exit(1);
  }

  section("user_financial_payload");
  const payload = await rest(token, `user_financial_payload?user_id=eq.${HOUSEHOLD_ID}&select=updated_at,payload`);
  if (!payload.ok) {
    console.log(`FAIL ${payload.status}:`, payload.data);
  } else if (!payload.data?.length) {
    console.log("VACÍO — sin fila para usuario principal");
  } else {
    const row = payload.data[0];
    const concepts = row.payload?.moduleData?.budgetConcepts?.length ?? 0;
    const txs = row.payload?.transactions?.length ?? 0;
    console.log(`updated_at: ${row.updated_at}`);
    console.log(`conceptos: ${concepts}, transacciones: ${txs}`);
  }

  section("brain_financial_snapshot");
  const snap = await rest(token, "brain_financial_snapshot?id=eq.household&select=updated_at,source,payload");
  if (!payload.ok && snap.status === 404) {
    console.log("Tabla no existe o sin acceso — ejecutar migración 20260610000000");
  } else if (!snap.ok) {
    console.log(`FAIL ${snap.status}:`, snap.data);
  } else if (!snap.data?.length) {
    console.log("VACÍO — sin snapshot household");
  } else {
    const row = snap.data[0];
    console.log(`updated_at: ${row.updated_at}, source: ${row.source}`);
    console.log(`transacciones: ${row.payload?.transactions?.length ?? 0}`);
  }

  section("products (compras)");
  const products = await rest(token, "products?select=id&limit=1", { prefer: "count=exact" });
  // count from Content-Range header would need raw fetch; use select count
  const productsAll = await rest(token, "products?select=id");
  if (!productsAll.ok) {
    console.log(`FAIL ${productsAll.status}:`, productsAll.data);
  } else {
    console.log(`productos visibles con login hogar: ${productsAll.data?.length ?? 0}`);
  }

  section("categories");
  const cats = await rest(token, "categories?select=id,name");
  console.log(cats.ok ? `categorías: ${cats.data?.length ?? 0}` : `FAIL ${cats.status}`);

  console.log("\nDiagnóstico REST completado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
