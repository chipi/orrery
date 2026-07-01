#!/usr/bin/env node
/**
 * Bundle the per-topic i18n overlay files into one JSON per locale.
 *
 * WHY: the overlay system ships ~740 tiny JSON files PER locale
 * (static/data/i18n/{locale}/**), i.e. ~10,360 files across 14 locales.
 * Precaching that many individual files never finishes installing the
 * service worker on mobile WebKit (the 0.6.3-stuck bug). Bundling to one
 * file per locale turns ~10,360 precache entries into 14, so the SW
 * install completes. See docs/wip/pwa-upgrade-path-handover.md.
 *
 * The source per-file tree is left UNTOUCHED — translator scripts, the
 * `$data` build-time imports, and the filesystem drift tests all keep
 * working. This step is purely additive and runs before `vite build`.
 *
 * Output: static/data/i18n/{locale}.json = { "<relpath>": <content>, ... }
 * keyed by the file's path relative to the locale dir (forward-slashed),
 * e.g. "sun.json", "planets/mars.json", "science/orbits/vis-viva.json".
 * The runtime loader (src/lib/data.ts get()) fetches this bundle once and
 * indexes by that same key.
 */
import fs from 'node:fs';
import path from 'node:path';

const I18N = path.join(process.cwd(), 'static/data/i18n');

function walkJson(dir, base, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJson(p, base, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

function main() {
  if (!fs.existsSync(I18N)) {
    console.error(`[i18n-bundles] no ${I18N}`);
    process.exit(1);
  }
  const locales = fs
    .readdirSync(I18N, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let totalIn = 0;
  const summary = [];
  for (const loc of locales) {
    const dir = path.join(I18N, loc);
    const files = walkJson(dir, dir, []);
    const bundle = {};
    for (const f of files) {
      const key = path.relative(dir, f).split(path.sep).join('/');
      try {
        bundle[key] = JSON.parse(fs.readFileSync(f, 'utf8'));
      } catch (err) {
        console.error(`[i18n-bundles] bad JSON: ${f}\n  ${err.message}`);
        process.exit(1);
      }
    }
    const outPath = path.join(I18N, `${loc}.json`);
    const json = JSON.stringify(bundle);
    fs.writeFileSync(outPath, json, 'utf8');
    totalIn += files.length;
    summary.push({ loc, keys: files.length, kb: (json.length / 1024).toFixed(0) });
  }

  const kByLoc = summary.map((s) => s.keys);
  const consistent = kByLoc.every((k) => k === kByLoc[0]);
  console.log(
    `[i18n-bundles] ${locales.length} locales, ${totalIn} source files -> ${locales.length} bundles`,
  );
  for (const s of summary)
    console.log(`  ${s.loc.padEnd(9)} ${String(s.keys).padStart(4)} keys  ${s.kb.padStart(5)} KB`);
  if (!consistent) {
    console.warn(
      `[i18n-bundles] WARN: locales have differing key counts (base has ${kByLoc[0]}); overlays may be incomplete — bundles still valid (missing keys fall back to en-US at runtime).`,
    );
  }
}

main();
