/**
 * Re-resolve image-provenance rows against a named Wikimedia Commons file —
 * for rows whose recorded Commons title never existed (no pageid; the credit
 * is the agency fallback) once the real file has been identified, e.g. the
 * same NASA PIA/GPN id under another name.
 *
 * Input: a JSON map { "<served image path>": "<Commons filename>" }. Each row
 * is rebuilt through build-image-provenance's own buildWikimediaEntry (author,
 * licence, licence gate, source and image URLs from the Commons API); its
 * current values stay as the fallbacks. Refuses a file Commons does not have.
 *
 * Usage: npx tsx scripts/backfill-provenance-commons.ts <map.json> [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWikimediaEntry, inferAgencyFromCuratedString } from './build-image-provenance.ts';

const FILE = 'static/data/image-provenance.json';
const [mapPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!mapPath) {
  console.error('usage: npx tsx scripts/backfill-provenance-commons.ts <map.json> [--dry-run]');
  process.exit(2);
}
// Values are a Commons filename, or image-find-source.mjs's {source, id} (only 'commons' ones).
const raw: Record<string, string | { source: string; id: string }> = JSON.parse(
  readFileSync(mapPath, 'utf8'),
);
const fix: Record<string, string> = Object.fromEntries(
  Object.entries(raw).flatMap(([p, v]) =>
    typeof v === 'string' ? [[p, v]] : v.source === 'commons' ? [[p, v.id]] : [],
  ),
);
const manifest = JSON.parse(readFileSync(FILE, 'utf8'));
const entries: Record<string, unknown>[] = manifest.entries;
// A gallery image with no row at all (validate-gallery-credits KNOWN_MISSING) gets one here; its
// id comes from buildWikimediaEntry like any built row.
for (const path of Object.keys(fix)) {
  if (entries.some((e) => e.path === path)) continue;
  // next to its gallery's other rows (the file is not sorted; a sort would rewrite all of it)
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const last = entries.findLastIndex((e) => String(e.path).startsWith(dir));
  entries.splice(last === -1 ? entries.length : last + 1, 0, {
    path,
    id: '',
    author: '',
    agency: '',
    license_short: '',
    license_url: null,
    license_rationale: '',
    modifications: ['identified-by-image-match'],
  });
  console.log(`  new row: ${path}`);
}

let rebuilt = 0;
const failed: string[] = [];
for (let i = 0; i < entries.length; i++) {
  const e = entries[i] as Record<string, string | null | string[]>;
  const filename = fix[String(e.path)];
  if (!filename) continue;
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
  if (next.pageid == null) {
    failed.push(`${e.path} → File:${filename}`);
    continue;
  }
  // a new row has no agency to fall back on: read it from the Commons author and title
  const agency =
    next.agency ||
    inferAgencyFromCuratedString(`${next.author ?? ''} ${next.title}`, next.author ?? '');
  entries[i] = { ...next, agency, id: e.id || next.id };
  rebuilt++;
  console.log(`  ${e.path} → ${next.title} · ${next.author} · ${next.license_short}`);
}
const unmatched = Object.keys(fix).filter((p) => !entries.some((e) => e.path === p));
console.log(`rebuilt ${rebuilt} rows`);
if (failed.length || unmatched.length) {
  if (failed.length) console.error(`✗ not on Commons:\n  ${failed.join('\n  ')}`);
  if (unmatched.length) console.error(`✗ no row with path:\n  ${unmatched.join('\n  ')}`);
  process.exit(1);
}
if (!dry) {
  writeFileSync(FILE, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`wrote ${FILE}`);
}
