#!/usr/bin/env node
/**
 * Mobile on-device size budget (ADR-079 D4 · Layer 1 of the mobile test
 * strategy, docs/guides/mobile-testing.md).
 *
 * Locks in the stream-heavy prune (ADR-078/-079): if the Capacitor build/
 * exceeds BUDGET_MB, a leak has crept back — a non-en locale HTML tree, the
 * images/audio buckets, or the 4K planet textures reappearing off their gate.
 * Fails the build so the regression surfaces here, not on a device or in a
 * bloated OTA download.
 *
 * Runs LAST in `build:mobile`, after prune + downscale. NO-OP unless MOBILE=1,
 * so the browser build (which legitimately ships everything) is never gated.
 *
 * Headroom: cumulative real-data growth (the /science + /programs + essays waves,
 * and the /explore v2 "Known Universe" catalogues — ~4 MB of minified HYG star
 * shells + exoplanet/deep-sky/black-hole/local-group JSON) took the pruned build
 * to ~67 MB. Budget raised 65 → 68 MB to fit that (a data floor, not a leak). Still
 * trips on a structural re-leak (a ~20 MB 4K-texture bucket → ~87 MB ≫ 68) and
 * stays well under the iOS 200 MB cellular-OTA cap. Headroom is now thin (~1 MB);
 * re-baseline (or re-prune the outer star shells for mobile) if it trips again.
 */
import { statSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const BUILD = path.resolve(process.cwd(), 'build');
const BUDGET_MB = 68;

if (process.env.MOBILE !== '1') {
  console.log('[size-budget] MOBILE != 1 — skipping (browser build is not budgeted).');
  process.exit(0);
}

if (!existsSync(BUILD)) {
  console.error(`[size-budget] no build/ at ${BUILD} — run the build first.`);
  process.exit(1);
}

function sizeOf(dir) {
  let total = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    total += e.isDirectory() ? sizeOf(full) : statSync(full).size;
  }
  return total;
}

const bytes = sizeOf(BUILD);
const mb = bytes / 1024 / 1024;
const budgetBytes = BUDGET_MB * 1024 * 1024;

if (bytes > budgetBytes) {
  // Surface the biggest buckets so the leak is obvious at a glance.
  const buckets = readdirSync(BUILD, { withFileTypes: true })
    .map((e) => {
      const full = path.join(BUILD, e.name);
      return { name: e.name, mb: (e.isDirectory() ? sizeOf(full) : statSync(full).size) / 1048576 };
    })
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 8);
  console.error(
    `[size-budget] ✗ mobile build/ is ${mb.toFixed(1)} MB — over the ${BUDGET_MB} MB budget.\n` +
      `  A pruned bucket likely leaked back. Largest:\n` +
      buckets.map((b) => `    ${b.mb.toFixed(1).padStart(6)} MB  ${b.name}`).join('\n'),
  );
  process.exit(1);
}

console.log(`[size-budget] ✓ mobile build/ is ${mb.toFixed(1)} MB (budget ${BUDGET_MB} MB).`);
