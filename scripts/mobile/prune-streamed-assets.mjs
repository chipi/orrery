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

const BUILD = path.resolve(process.cwd(), 'build');
const DEFAULT_LOCALE = 'en-US';

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
