/**
 * Fill missing per-locale hotspot-metadata stubs (#42 e2e fix).
 *
 * The /moon + /mars data loader calls
 * `i18n/${locale}/hotspot-metadata/${siteId}.json` for every site
 * that carries `hotspot_annotations` (even empty []). Missing files
 * 404 — the .catch(() => null) handles the JS side gracefully, but
 * the network request itself shows up as `console.error` in e2e
 * tests that assert clean console.
 *
 * This script ensures every (site, locale) combo has a file. New
 * files are created with `{"hotspot_annotations": []}` — the
 * placeholder shape /moon + /mars already use for sites that don't
 * need per-locale annotation translation. Existing files (with real
 * translations) are NOT touched.
 *
 * Idempotent: re-running is a no-op once gaps are filled.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SIDECAR = join(ROOT, 'static/data/surface-hotspots.json');
const I18N_ROOT = join(ROOT, 'static/data/i18n');

const LOCALES = [
  'ar',
  'de',
  'en-US',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
] as const;

type Sidecar = {
  entries: Record<string, { hotspot_annotations?: unknown[] }>;
};

const sidecar = JSON.parse(readFileSync(SIDECAR, 'utf-8')) as Sidecar;
const sites = Object.entries(sidecar.entries)
  .filter(([, v]) => v.hotspot_annotations != null)
  .map(([k]) => k)
  .sort();

const PLACEHOLDER = '{"hotspot_annotations": []}\n';

let created = 0;
let skipped = 0;
for (const locale of LOCALES) {
  const dir = join(I18N_ROOT, locale, 'hotspot-metadata');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const siteId of sites) {
    const file = join(dir, `${siteId}.json`);
    if (existsSync(file)) {
      skipped += 1;
      continue;
    }
    writeFileSync(file, PLACEHOLDER);
    created += 1;
  }
}

console.log(`Sites with hotspot_annotations: ${sites.length}`);
console.log(`Locales: ${LOCALES.length}`);
console.log(`Created: ${created} new placeholder file(s)`);
console.log(`Skipped: ${skipped} existing file(s) (preserved)`);
