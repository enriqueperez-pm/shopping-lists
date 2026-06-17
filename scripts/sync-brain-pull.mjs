#!/usr/bin/env node
/** Wrapper — nube → brain CSV */
import { runPullFromCloud } from "../../../brain/finanzas/scripts/pull-from-cloud.mjs";

const code = await runPullFromCloud(process.argv);
process.exit(code);
