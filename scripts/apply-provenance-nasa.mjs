/**
 * Credit image-provenance rows to the NASA Images item they really are, once the match is known
 * (image-find-source.mjs, then a look at each pair). Title and author come from the NASA Images
 * API (`secondary_creator`, else `photographer`, else NASA/<center>); the licence is PD-NASA,
 * the source the item's images.nasa.gov page. Refuses an id the API doesn't know.
 *
 * Input: { "<served image path>": "<nasa_id>" } or image-find-source.mjs's
 * { "<path>": {source, id} } (only 'nasa' entries are used). A row's 1x1 crop is not implied:
 * list it too.
 *
 * Usage: node scripts/apply-provenance-nasa.mjs <map.json> [--dry-run]
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { USER_AGENT } from './lib/link-probe.mjs';

const FILE = 'static/data/image-provenance.json';
const [mapPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!mapPath) {
  console.error('usage: node scripts/apply-provenance-nasa.mjs <map.json> [--dry-run]');
  process.exit(2);
}
const raw = JSON.parse(readFileSync(mapPath, 'utf8'));
const fix = Object.fromEntries(
  Object.entries(raw).flatMap(([p, v]) =>
    typeof v === 'string' ? [[p, v]] : v.source === 'nasa' ? [[p, v.id]] : [],
  ),
);

const meta = {};
for (const id of new Set(Object.values(fix))) {
  const res = await fetch(`https://images-api.nasa.gov/search?nasa_id=${encodeURIComponent(id)}`, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  const d = (await res.json())?.collection?.items?.[0]?.data?.[0];
  if (!d) {
    console.error(`no NASA Images item ${id}`);
    process.exit(1);
  }
  const title = d.title && d.title !== id ? d.title : (d.description ?? id).slice(0, 90);
  const author =
    d.secondary_creator || d.photographer || `NASA/${d.center ?? ''}`.replace(/\/$/, '');
  meta[id] = { title: `${title} (${id})`, author };
}

const manifest = JSON.parse(readFileSync(FILE, 'utf8'));
// A gallery image with no row at all gets one, next to its gallery's rows, with the id
// build-image-provenance gives a new row (sha256 of the served path, 16 hex).
for (const path of Object.keys(fix)) {
  if (manifest.entries.some((e) => e.path === path)) continue;
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const last = manifest.entries.findLastIndex((e) => e.path.startsWith(dir));
  const id = createHash('sha256').update(path).digest('hex').slice(0, 16);
  manifest.entries.splice(last === -1 ? manifest.entries.length : last + 1, 0, { id, path });
  console.log(`  new row: ${path}`);
}
let n = 0;
for (const e of manifest.entries) {
  const id = fix[e.path];
  if (!id) continue;
  Object.assign(e, {
    source_type: 'nasa-images-api',
    title: meta[id].title,
    author: meta[id].author,
    agency: 'NASA',
    source_url: `https://images.nasa.gov/details/${id}`,
    image_url: null,
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale:
      'NASA-produced media is generally not copyrighted (17 U.S.C. §105). Use is permitted; trademark + endorsement rules apply.',
    modifications: ['identified-by-image-match'],
    revid: null,
    pageid: null,
    nasa_id: id,
    fetched_at: new Date().toISOString(),
  });
  console.log(`  ${e.path} → ${meta[id].title} · ${meta[id].author}`);
  n++;
}
const missing = Object.keys(fix).filter((p) => !manifest.entries.some((e) => e.path === p));
if (missing.length) {
  console.error(`no provenance row for: ${missing.join(', ')}`);
  process.exit(1);
}
if (!dry) writeFileSync(FILE, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${dry ? 'would rebuild' : 'rebuilt'} ${n} rows`);
