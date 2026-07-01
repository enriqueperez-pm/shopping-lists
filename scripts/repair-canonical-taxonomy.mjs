/**
 * One-shot repair: enforce canonical taxonomy on local payload export.
 * Usage: node scripts/repair-canonical-taxonomy.mjs
 * Requires .env.local with SUPABASE_SYNC_EMAIL/PASSWORD for cloud push (optional).
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exportPath = join(__dirname, "../../../brain/finanzas/data/sync-payload-export.json");

if (!existsSync(exportPath)) {
  console.error("No sync-payload-export.json found. Run npm run sync:brain:pull first.");
  process.exit(1);
}

console.log("Repair script requires in-app enforceCanonicalTaxonomy.");
console.log("Open the app or run sync:brain after deploying the repair.");
console.log("Payload at:", exportPath);
