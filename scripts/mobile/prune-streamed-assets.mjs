#!/usr/bin/env node
/**
 * Stream-heavy asset prune for the Capacitor mobile build (RFC-018 §4 /
 * ADR-078 D2).
 *
 * The browser build ships every asset locally. The mobile build cannot —
 * a naive `cap sync` of `build/` produces a ~2 GB app, 10× the iOS 200 MB
 * OTA cap. This script runs AFTER `MOBILE=1 npm run build` and removes the
 * heavy buckets from `build/` so `cap sync` never copies them into the
 * native app. At runtime those URLs 404 against the local bundle and the
 * service-worker runtimeCaching rules (S3) fetch + cache them from
 * https://chipi.github.io/orrery instead.
 *
 * Pruned buckets:
 *   - build/images/                  gallery + hero + surface imagery (~1.6 GB)
 *   - build/audio/                   narration + Curator Tour (~97 MB)
 *   - build/data/i18n/<non-en>.json  13 non-default collapsed locale bundles
 *   - build/data/i18n/<locale>/      raw per-topic overlay trees — build-time
 *                                    source only; runtime loads the collapsed
 *                                    <locale>.json (src/lib/data.ts), never the
 *                                    raw tree, so all of it is dead weight.
 *   - build/<non-en-locale>/         prerendered per-locale HTML trees + the
 *   - build/<non-en-locale>.html     locale-root page (~70 MB across 13
 *                                    locales). On-device the app is a SPA: in-
 *                                    app navigation is client-side (SvelteKit
 *                                    router / goto), and a hard nav to a pruned
 *                                    /de/… falls back to the precached 404.html
 *                                    shell (adapter fallback + SW
 *                                    navigateFallback), which reroute-strips the
 *                                    locale prefix and renders client-side. The
 *                                    prerendered HTML is a first-paint/SEO
 *                                    nicety irrelevant to a single-user local
 *                                    bundle. en-US (baseLocale) stays at the
 *                                    root so cold start has a real entry page.
 *   - build/**\/*.{br,gz}            precompressed siblings (vite-plugin-
 *                                    compression2) — served by nginx on the web
 *                                    deploy, but a Capacitor WKWebView loads
 *                                    from file:// and only ever requests the
 *                                    plain file, so every .br/.gz is dead weight.
 *
 * NO-OP unless MOBILE=1, so it is safe to leave in a shared build chain.
 * Idempotent: missing targets are skipped without error.
 */
import { rm, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { locales, baseLocale } from '../../src/lib/paraglide/runtime.js';

const BUILD = path.resolve(process.cwd(), 'build');
const DEFAULT_LOCALE = baseLocale;

// 4K planet/surface textures whose 2K sibling ships on-device. The 4K LOD
// upgrade is gated off under __MOBILE__ at every load site (explore, fly, iss,
// tiangong, SurfaceScene — ADR-079 D3), so these are never requested on mobile.
// The four base-4K bodies with NO 2K sibling (io, titan, enceladus, pluto) are
// NOT listed here — they're downscaled in place by downscale-base-textures.mjs.
const PRUNED_4K_TEXTURES = [
  'textures/4k_earth_daymap.jpg',
  'textures/4k_moon.jpg',
  'textures/4k_mars.jpg',
  'textures/4k_mercury.jpg',
  'textures/4k_venus_atmosphere.jpg',
  'textures/4k_jupiter.jpg',
  'textures/4k_saturn.jpg',
  'textures/4k_sun.jpg',
];

if (process.env.MOBILE !== '1') {
  console.log('[prune-mobile] MOBILE != 1 — skipping (browser build untouched).');
  process.exit(0);
}

if (!existsSync(BUILD)) {
  console.error(`[prune-mobile] no build/ at ${BUILD} — run the build first.`);
  process.exit(1);
}

/** Recursive byte size of a file or directory. */
async function sizeOf(p) {
  let s;
  try {
    s = await stat(p);
  } catch {
    return 0;
  }
  if (s.isFile()) return s.size;
  let total = 0;
  for (const entry of await readdir(p, { withFileTypes: true })) {
    total += await sizeOf(path.join(p, entry.name));
  }
  return total;
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);

/** Recursively collect every *.br / *.gz precompressed sibling under dir. */
async function compressedSiblings(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await compressedSiblings(full)));
    else if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) out.push(full);
  }
  return out;
}

/** Collect the prune targets (absolute paths). */
async function targets() {
  const list = [];
  list.push(path.join(BUILD, 'images'));
  list.push(path.join(BUILD, 'audio'));

  const i18n = path.join(BUILD, 'data', 'i18n');
  if (existsSync(i18n)) {
    for (const entry of await readdir(i18n, { withFileTypes: true })) {
      const full = path.join(i18n, entry.name);
      if (entry.isDirectory()) {
        // Raw per-locale overlay tree — never fetched at runtime.
        list.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Collapsed locale bundle — keep the default locale, stream the rest.
        if (entry.name !== `${DEFAULT_LOCALE}.json`) list.push(full);
      }
    }
  }

  // Non-default-locale prerendered HTML: the /<locale>/ tree + the /<locale>.html
  // root page. Rendered client-side on-device (see header). Keep baseLocale.
  for (const locale of locales) {
    if (locale === baseLocale) continue;
    list.push(path.join(BUILD, locale));
    list.push(path.join(BUILD, `${locale}.html`));
  }

  // 4K LOD textures with a 2K on-device sibling (gated off under __MOBILE__).
  for (const rel of PRUNED_4K_TEXTURES) list.push(path.join(BUILD, rel));

  // Precompressed siblings are collected last so the summary logs them as
  // one group rather than 1,600+ lines.
  list.push(...(await compressedSiblings(BUILD)));
  return list;
}

let freed = 0;
let pruned = 0;
let compressedBytes = 0;
let compressedCount = 0;
const before = await sizeOf(BUILD);

for (const t of await targets()) {
  if (!existsSync(t)) continue;
  const bytes = await sizeOf(t);
  await rm(t, { recursive: true, force: true });
  freed += bytes;
  pruned += 1;
  if (t.endsWith('.br') || t.endsWith('.gz')) {
    // Aggregate the 1,600+ precompressed siblings into one summary line.
    compressedBytes += bytes;
    compressedCount += 1;
    continue;
  }
  console.log(`[prune-mobile] − ${path.relative(BUILD, t).padEnd(28)} ${mb(bytes).padStart(8)} MB`);
}
if (compressedCount) {
  console.log(
    `[prune-mobile] − ${`*.br/*.gz (${compressedCount} files)`.padEnd(28)} ${mb(compressedBytes).padStart(8)} MB`,
  );
}

const after = await sizeOf(BUILD);
console.log(
  `[prune-mobile] pruned ${pruned} targets · freed ${mb(freed)} MB · ` +
    `build/ ${mb(before)} MB → ${mb(after)} MB (kept ${DEFAULT_LOCALE} locale on-device)`,
);
