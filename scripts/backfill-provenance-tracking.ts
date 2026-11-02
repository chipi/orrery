/**
 * One-shot surgery on static/data/image-provenance.json (2026-11-01): remove
 * the utm_* tracking that Commons' imageinfo API appends to URLs.
 *
 * - Rows whose *filename* carried "?utm_…" (the sidecar URL had it, and the
 *   upload-URL pattern took it into the filename) never matched a Commons
 *   page, so title, author, licence and pageid are fallbacks. They are
 *   re-resolved through build-image-provenance's own buildWikimediaEntry with
 *   the clean filename; the row's current values stay as the fallbacks.
 * - Every other row only loses utm_* from source_url / image_url.
 *
 * build-image-provenance.ts strips tracking itself now (lib/strip-tracking.ts), so a
 * future rebuild produces the same result. Edits in place (the builder's own
 * advice: edit surgically rather than rebuild the corpus).
 *
 * Usage: npx tsx scripts/backfill-provenance-tracking.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWikimediaEntry } from './build-image-provenance.ts';
import { stripTracking } from './lib/strip-tracking.ts';

const FILE = 'static/data/image-provenance.json';
const dry = process.argv.includes('--dry-run');

const raw = readFileSync(FILE, 'utf8');
const manifest = JSON.parse(raw);
const entries: Record<string, unknown>[] = manifest.entries;

const TRACK = /[?&]utm_|%3Futm_|%26utm_/i;
let rebuilt = 0;
let stripped = 0;
const unresolved: string[] = [];

for (let i = 0; i < entries.length; i++) {
  const e = entries[i] as Record<string, string | null | string[]>;
  const title = String(e.title ?? '');
  if (e.source_type === 'wikimedia-commons' && /\?utm_/.test(title)) {
    const filename = title.replace(/^File:/, '').replace(/\?utm_.*$/, '');
    const next = await buildWikimediaEntry({
      localPath: `static${e.path}`,
      filename,
      fallbackAuthor: String(e.author ?? ''),
      fallbackAgency: String(e.agency ?? ''),
      fallbackLicense: String(e.license_short ?? ''),
      fallbackLicenseUrl: (e.license_url as string | null) ?? null,
      fallbackLicenseRationale: String(e.license_rationale ?? ''),
      fallbackTitle: `File:${filename}`,
      modifications: (e.modifications as string[]) ?? [],
    });
    if (next.pageid == null) unresolved.push(`${e.path} (File:${filename})`);
    entries[i] = { ...next, id: e.id };
    rebuilt++;
    continue;
  }
  for (const k of ['source_url', 'image_url'] as const) {
    const v = e[k];
    if (typeof v === 'string' && TRACK.test(v)) {
      e[k] = stripTracking(v);
      stripped++;
    }
  }
}

console.log(`rebuilt ${rebuilt} rows from Commons, stripped tracking from ${stripped} URLs`);
if (unresolved.length) {
  console.log(`still unresolved on Commons (kept fallbacks):\n  ${unresolved.join('\n  ')}`);
}
if (!dry) {
  writeFileSync(FILE, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`wrote ${FILE}`);
}
