#!/usr/bin/env node
/**
 * Sync brain CSV → Supabase user_financial_payload
 *
 * Auth (pick one, in app/klagi/.env.local):
 *   SUPABASE_SYNC_EMAIL + SUPABASE_SYNC_PASSWORD  ← recomendado (login hogar)
 *   SUPABASE_SERVICE_ROLE_KEY                     ← opcional
 *
 * Usage:
 *   node brain/finanzas/scripts/sync-to-cloud.mjs
 *   node brain/finanzas/scripts/sync-to-cloud.mjs --export-only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  buildPayloadFromBrain,
  mergeWithRemotePayload,
  HOUSEHOLD_PAYLOAD_USER_ID,
} from "./brain-to-payload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KLAGI_ROOT = path.resolve(__dirname, "../../../app/klagi");
const DATA_DIR = path.resolve(__dirname, "../data");

function normalizeUrl(input) {
  return input.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

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
  loadEnvFile(path.join(KLAGI_ROOT, ".env.local.example"));
}

function writeSqlFallback(finalPayload, sqlPath) {
  const jsonEsc = JSON.stringify(finalPayload).replace(/'/g, "''");
  fs.writeFileSync(
    sqlPath,
    `-- Fallback manual (solo si falla sync automático)\nINSERT INTO public.user_financial_payload (user_id, payload, updated_at)\nVALUES ('${HOUSEHOLD_PAYLOAD_USER_ID}'::uuid, '${jsonEsc}'::jsonb, now())\nON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();\n`,
    "utf8",
  );
}

async function supabaseRest(baseUrl, apiKey, bearer, resource, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${baseUrl}/rest/v1/${resource}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data?.message
        ? data.message
        : typeof data === "string"
          ? data
          : res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}

async function signInHousehold(baseUrl, anonKey, email, password) {
  const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || res.statusText;
    throw new Error(`Login falló: ${msg}`);
  }
  if (!data.access_token) {
    throw new Error("Login falló: no access_token");
  }
  return data.access_token;
}

async function resolveBearer(url, anonKey, serviceKey, syncEmail, syncPassword) {
  if (serviceKey) {
    console.log("Auth: service role");
    return serviceKey;
  }
  if (syncEmail && syncPassword) {
    console.log(`Auth: login hogar (${syncEmail})`);
    return signInHousehold(url, anonKey, syncEmail, syncPassword);
  }
  return null;
}

export async function runBrainSync(argv = process.argv) {
  loadEnv();

  const exportOnly = argv.includes("--export-only");
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const syncEmail = (process.env.SUPABASE_SYNC_EMAIL ?? "").trim();
  const syncPassword = (process.env.SUPABASE_SYNC_PASSWORD ?? "").trim();

  const { payload: brainPayload, stats } = buildPayloadFromBrain();
  const exportPath = path.join(DATA_DIR, "sync-payload-export.json");
  fs.writeFileSync(exportPath, JSON.stringify(brainPayload, null, 2), "utf8");

  console.log("Brain → payload");
  console.log(`  conceptos: ${stats.concepts}`);
  console.log(`  transacciones: ${stats.transactions}`);
  console.log(`  deudas: ${stats.debts}`);
  console.log(`  periodos: ${stats.periods.join(", ")}`);
  console.log(`  export: ${exportPath}`);

  if (exportOnly) {
    writeSqlFallback(brainPayload, path.join(DATA_DIR, "sync-payload-upsert.sql"));
    console.log("\n--export-only (sin subir)");
    return 0;
  }

  if (!url || !anonKey) {
    console.error("\nFalta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en app/klagi/.env.local");
    return 1;
  }

  const bearer = await resolveBearer(url, anonKey, serviceKey, syncEmail, syncPassword);
  const sqlPath = path.join(DATA_DIR, "sync-payload-upsert.sql");
  if (!bearer) {
    writeSqlFallback(brainPayload, sqlPath);
    console.error(`
No hay credenciales para subir a Supabase.

Agrega UNA vez en app/klagi/.env.local (mismo login que la app):

  SUPABASE_SYNC_EMAIL=tu@correo.com
  SUPABASE_SYNC_PASSWORD=tu-contraseña

Luego: npm run sync:brain

SQL fallback generado: ${sqlPath}
(Pégalo en Supabase SQL Editor si prefieres no usar credenciales en .env.local)
`);
    return 1;
  }

  let remotePayload = null;
  try {
    const rows = await supabaseRest(
      url,
      anonKey,
      bearer,
      `user_financial_payload?user_id=eq.${HOUSEHOLD_PAYLOAD_USER_ID}&select=payload`,
    );
    if (Array.isArray(rows) && rows[0]?.payload) {
      remotePayload = rows[0].payload;
      console.log("\nRemoto OK — fusionando compras + otros periodos.");
    }
  } catch (err) {
    console.warn("Fetch remoto:", err.message);
  }

  const finalPayload = mergeWithRemotePayload(brainPayload, remotePayload);

  try {
    await supabaseRest(url, anonKey, bearer, "user_financial_payload?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: {
        user_id: HOUSEHOLD_PAYLOAD_USER_ID,
        payload: finalPayload,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("\nUpsert falló:", err.message);
    writeSqlFallback(finalPayload, sqlPath);
    console.error(`SQL fallback: ${sqlPath}`);
    return 1;
  }

  console.log("\nSync OK → Supabase");
  console.log(`  user_id: ${HOUSEHOLD_PAYLOAD_USER_ID}`);
  console.log("  https://project-klagi.vercel.app/presupuesto");
  return 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runBrainSync().then((code) => process.exit(code));
}
