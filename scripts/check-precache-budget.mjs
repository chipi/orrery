#!/usr/bin/env node
// Precache-size budget gate (2026-06-30).
//
// WHY: the Workbox precache install is all-or-nothing, and iOS Safari's
// CacheStorage quota is small. A precache that's too big silently FAILS to
// install on iOS → the new service worker never activates → mobile devices
// freeze on an old version while desktop (huge quota) keeps updating. This
// is invisible from a dev's own desktop. A 1.7 GB precache (every gallery
// image) caused exactly that — devices stuck on 0.6.3.
//
// This gate parses the built `build/sw.js` precache manifest, sums the bytes,
// and FAILS the build if it exceeds BUDGET_MB. Keep imagery OUT of the
// precache (runtime-cache it instead) — see vite.config.ts workbox config.
//
// Run after `vite build` (needs build/sw.js). Wired into `npm run build`.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUILD_DIR = 'build';
const SW_PATH = join(BUILD_DIR, 'sw.js');
// Hard ceiling well under iOS's CacheStorage quota. Current app-shell
// precache is ~35 MB; this leaves headroom for prerendered-HTML growth
// without ever approaching the iOS limit. If you trip this, do NOT raise
// it — move whatever ballooned the precache to runtime caching.
const BUDGET_MB = 50;

let sw;
try {
  sw = readFileSync(SW_PATH, 'utf8');
} catch {
  console.error(`check-precache-budget: ${SW_PATH} not found — run after \`vite build\`.`);
  process.exit(2);
}

const urls = [...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error('check-precache-budget: no precache entries parsed from sw.js (format changed?).');
  process.exit(2);
}

let total = 0;
const byExt = {};
const missing = [];
for (const url of urls) {
  // sw.js URLs are base-absolute (e.g. /orrery/_app/…); map back into build/.
  const rel = decodeURIComponent(url.replace(/^\//, '').replace(/^orrery\//, ''));
  try {
    const size = statSync(join(BUILD_DIR, rel)).size;
    total += size;
    const ext = (rel.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'other').toLowerCase();
    byExt[ext] = (byExt[ext] ?? 0) + size;
  } catch {
    missing.push(rel);
  }
}

const mb = total / 1048576;
const fmt = (b) => `${(b / 1048576).toFixed(1)} MB`;
const top = Object.entries(byExt)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([e, b]) => `${e}:${fmt(b)}`)
  .join('  ');

console.log(
  `check-precache-budget: ${urls.length} entries, ${mb.toFixed(1)} MB precached (budget ${BUDGET_MB} MB)`,
);
console.log(`  by type: ${top}`);
const rasters = (byExt.jpg ?? 0) + (byExt.jpeg ?? 0) + (byExt.png ?? 0) + (byExt.webp ?? 0);
if (rasters > 5 * 1048576) {
  console.warn(
    `  ⚠ ${fmt(rasters)} of raster imagery is in the precache — imagery should be runtime-cached, not precached.`,
  );
}

if (mb > BUDGET_MB) {
  console.error(
    `✗ precache ${mb.toFixed(1)} MB exceeds ${BUDGET_MB} MB — this can overflow the iOS CacheStorage quota and silently break SW install on iOS (devices freeze on the old version). Move large assets (imagery) to runtime caching in vite.config.ts instead of precaching.`,
  );
  process.exit(1);
}
console.log('✓ precache within budget');
