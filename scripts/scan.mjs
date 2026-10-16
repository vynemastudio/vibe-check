#!/usr/bin/env node
/**
 * Convenience entry point so `node scripts/scan.mjs` works from the repo root.
 *
 * The scanner itself lives inside the skill, at
 * skills/vibe-check/scripts/scan.mjs, so that installing the skill (or the
 * plugin, or the zip) carries it along. This file only forwards — there is
 * exactly one copy of the real code.
 */
import { main } from '../skills/vibe-check/scripts/scan.mjs';
process.exit(main(process.argv.slice(2)));
