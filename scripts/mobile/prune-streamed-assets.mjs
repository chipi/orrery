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
 * https://www.orrerylearn.com (the default STREAM_ORIGIN) instead.
 *
 * Pruned buckets:
 *   - build/images/                  gallery + hero + surface imagery (~1.6 GB)
 *   - build/audio/                   narration + Curator Tour (~97 MB)
 *   - build/credit-thumbs/           /credits thumbnails (~6.9 MB), streamed via
 *                                    assetUrl() like /images
 *   - build/diagrams/**\/*-<w>.webp   diagram width rungs; on-device srcsetFor
 *                                    skips /diagrams and uses the base file
 *   - build/data/i18n/<non-en>*.json 13 non-default locale bundles + their chunks
 *   - build/data/i18n/en-US.json     the whole-locale en-US bundle: the app loads
 *                                    only the en-US.<chunk>.json files (kept)
 *   - build/data/image-alt-text/<non-en>.json  13 alt-text overlays, streamed the same way
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
import { rm, stat, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { locales, baseLocale } from '../../src/lib/paraglide/runtime.js';

const BUILD = path.resolve(process.cwd(), 'build');
const DEFAULT_LOCALE = baseLocale;

// 4K planet/surface textures whose 2K sibling ships on-device. The 4K LOD
// upgrade is gated off under __MOBILE__ at every load site (explore, fly, iss,
// tiangong, SurfaceScene — ADR-079 D3), so these are never requested on mobile.
// io, titan, enceladus and pluto got 2K siblings in #596 (they used to be base-4K
// and were shrunk in place), so they are pruned like the rest.
const PRUNED_4K_TEXTURES = [
  'textures/4k_io.jpg',
  'textures/4k_titan.jpg',
  'textures/4k_enceladus.jpg',
  'textures/4k_pluto.jpg',
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

/** Width-rung files (`*-<digits>.webp`) under the diagrams tree. */
async function diagramRungs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await diagramRungs(full)));
    else if (/-\d+\.webp$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Collect the prune targets (absolute paths). */
async function targets() {
  const list = [];
  list.push(path.join(BUILD, 'images'));
  list.push(path.join(BUILD, 'audio'));

  // The sitemaps are search-engine artifacts — the sitemap.xml index plus
  // sitemaps/<locale>.xml, ~7 MB together with per-URL hreflang alternates
  // (#519). Never used on-device (the Capacitor shell serves no crawlers), so
  // prune them off the mobile bundle; the web build keeps them. Without this
  // they pushed the mobile build over the 75 MB OTA budget.
  for (const p of ['sitemap.xml', 'sitemaps']) {
    const sitemap = path.join(BUILD, p);
    if (existsSync(sitemap)) list.push(sitemap);
  }

  // /c/* card share stubs (#547) are crawler/unfurl surfaces — 499
  // prerendered pages (~7.5 MB) the Capacitor shell never serves: shares
  // built on-device point at the PUBLIC origin (share.ts STREAM_ORIGIN),
  // so the stub a recipient opens is always the web deploy's copy.
  const cardStubs = path.join(BUILD, 'c');
  if (existsSync(cardStubs)) list.push(cardStubs);

  // Entity pages (0.9.8 SEO: /missions, /fleet, /<body>/<site>, /explore, /explore/stars/<id>,
  // /lab/<id>, × 14 locales) are search-engine surfaces; in the app an entity opens in its
  // ?id= / ?site= panel. /missions/launches is not an entity and stays.
  const json = async (file, empty) =>
    JSON.parse(await readFile(path.join(BUILD, 'data', file), 'utf8').catch(() => empty));
  const ids = async (file) => (await json(file, '[]')).map((e) => e.id);
  // /explore/<id>: planets (id = lowercase name), moons, small bodies. 'stars' is the
  // /explore/stars hub: its folder holds every /explore/stars/<id> page and their __data.json
  // (~66 stars × 14 locales ≈ 924 pages), and the hub page and its own __data.json go with it.
  const bodyIds = [
    'stars',
    ...((await json('planets.json', '{}')).planets?.map((p) => p.name.toLowerCase()) ?? []),
    ...((await json('satellites.json', '{}')).satellites?.map((s) => s.id) ?? []),
    ...((await json('small-bodies.json', '{}')).bodies?.map((b) => b.id) ?? []),
  ];
  for (const [dir, entityIds] of [
    ['explore', [...new Set(bodyIds)]],
    ['lab', (await json('lab-formulas.json', '{}')).ids ?? []],
    ['missions', await ids('missions/index.json')],
    ['fleet', await ids('fleet/index.json')],
    ['moon', await ids('moon-sites.json')],
    ['mars', await ids('mars-sites.json')],
    ['venus', await ids('venus-sites.json')],
  ]) {
    for (const prefix of ['', ...locales.filter((l) => l !== baseLocale)]) {
      for (const id of entityIds) {
        // The page and its <id>/__data.json (server-load data for client navigation).
        for (const p of [`${id}.html`, id]) {
          const page = path.join(BUILD, prefix, dir, p);
          if (existsSync(page)) list.push(page);
        }
      }
    }
  }

  // /credits thumbnails (#482, ~6.9 MB): the page builds their URLs with
  // assetUrl(), so on-device they stream from STREAM_ORIGIN like /images.
  const creditThumbs = path.join(BUILD, 'credit-thumbs');
  if (existsSync(creditThumbs)) list.push(creditThumbs);

  // Width rungs of /diagrams (`<stem>-320.webp`, `-640.webp`, #482). On-device
  // every diagram is local, so a smaller rung saves no transfer; srcsetFor
  // skips /diagrams under __MOBILE__ and the single base (downscaled to 1000 px
  // by downscale-diagrams.mjs) is used.
  list.push(...(await diagramRungs(path.join(BUILD, 'diagrams'))));

  const i18n = path.join(BUILD, 'data', 'i18n');
  if (existsSync(i18n)) {
    for (const entry of await readdir(i18n, { withFileTypes: true })) {
      const full = path.join(i18n, entry.name);
      if (entry.isDirectory()) {
        // Raw per-locale overlay tree — never fetched at runtime.
        list.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Locale bundles: keep the default locale's chunks (<locale>.<chunk>.json,
        // what the runtime loads), stream every other locale. The whole-locale
        // file is for released app versions, which stream it from the web.
        const isDefaultChunk =
          entry.name.startsWith(`${DEFAULT_LOCALE}.`) && entry.name !== `${DEFAULT_LOCALE}.json`;
        if (!isDefaultChunk) list.push(full);
      }
    }
  }

  // Non-default image alt-text overlays (~1 MB each since every alt text is translated,
  // 2026-10-21): streamed like the locale bundles ($lib/image-alt fetches them from
  // localeBundleOrigin). en-US stays on device: it is the fallback for every locale.
  const alt = path.join(BUILD, 'data', 'image-alt-text');
  if (existsSync(alt)) {
    for (const name of await readdir(alt))
      if (name.endsWith('.json') && name !== `${DEFAULT_LOCALE}.json`)
        list.push(path.join(alt, name));
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
let rungBytes = 0;
let rungCount = 0;
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
  if (/-\d+\.webp$/.test(t) && t.includes(`${path.sep}diagrams${path.sep}`)) {
    rungBytes += bytes;
    rungCount += 1;
    continue;
  }
  console.log(`[prune-mobile] − ${path.relative(BUILD, t).padEnd(28)} ${mb(bytes).padStart(8)} MB`);
}
if (rungCount) {
  console.log(
    `[prune-mobile] − ${`diagrams/**/*-<w>.webp (${rungCount} rungs)`.padEnd(28)} ${mb(rungBytes).padStart(8)} MB`,
  );
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
