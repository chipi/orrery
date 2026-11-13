#!/usr/bin/env node
/**
 * Stray Paraglide output gate: the compiled messages live in src/lib/paraglide/ only.
 *
 * A bare `paraglide-js compile` (no --outdir) writes to its default, src/paraglide/. That
 * folder is gitignored, so nothing shows in `git status`, but its ~3,700 generated .js files
 * under `allowJs`/`checkJs` leave svelte-check with an almost empty program: on 2026-11-13 it
 * reported "COMPLETED 106 FILES 0 ERRORS" for hours while four real type errors sat in
 * src/routes/explore/+page.svelte. svelte-check gives no warning, so this gate does.
 *
 *   node scripts/check-stray-paraglide.mjs   # exit 1 when src/paraglide/ exists
 *
 * Fix: delete src/paraglide/ and compile with `npm run i18n:compile` (it passes the outdir).
 *
 * Wired into validate-data, so preflight and CI fail on it.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRAY = join(ROOT, 'src', 'paraglide');

if (existsSync(STRAY)) {
  console.error(
    '✗ src/paraglide/ exists: stray output of a bare paraglide compile. It blinds svelte-check.\n' +
      '  Delete it and compile with `npm run i18n:compile` (output goes to src/lib/paraglide/).',
  );
  process.exit(1);
}
console.log('✓ no stray src/paraglide/ (compiled messages only in src/lib/paraglide/)');
