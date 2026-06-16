#!/usr/bin/env node
/** Wrapper — lógica en brain/finanzas/scripts/sync-to-cloud.mjs */
import { runBrainSync } from "../../../brain/finanzas/scripts/sync-to-cloud.mjs";

const code = await runBrainSync(process.argv);
process.exit(code);
