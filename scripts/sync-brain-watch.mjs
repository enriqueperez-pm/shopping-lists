#!/usr/bin/env node
/** Wrapper — watcher en brain/finanzas/scripts/sync-brain-watch.mjs */
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchPath = path.resolve(__dirname, "../../../brain/finanzas/scripts/sync-brain-watch.mjs");

await import(pathToFileURL(watchPath).href);
