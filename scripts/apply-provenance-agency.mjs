/**
 * Credit image-provenance rows to an image published on an agency's own website (not on Commons
 * or the NASA image library), once the match is known (a look at each pair). Sets the row to
 * `direct-agency` with the given title, author, agency, page and image URLs and licence; the
 * licence must already be in scripts/license-allowlist.ts (its url and rationale come from there).
 *
 * Input: { "<served image path>": { title, author, agency, source_url, image_url, license_short } }.
 * A row's 1x1 crop is not implied: list it too.
 *
 * Usage: node scripts/apply-provenance-agency.mjs <map.json> [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'static/data/image-provenance.json';
const [mapPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!mapPath) {
  console.error('usage: node scripts/apply-provenance-agency.mjs <map.json> [--dry-run]');
  process.exit(2);
}
const fix = JSON.parse(readFileSync(mapPath, 'utf8'));
const allow = readFileSync('scripts/license-allowlist.ts', 'utf8');
const manifest = JSON.parse(readFileSync(FILE, 'utf8'));
let n = 0;
const failed = [];
for (const [path, f] of Object.entries(fix)) {
  const e = manifest.entries.find((x) => x.path === path);
  if (!e) {
    failed.push(`${path}: no provenance row`);
    continue;
  }
  if (!allow.includes(`short: '${f.license_short}'`)) {
    failed.push(`${path}: licence ${f.license_short} is not in the allowlist`);
    continue;
  }
  // Reuse an existing row's url and rationale for the same licence (keeps one wording per licence).
  const twin = manifest.entries.find((x) => x.license_short === f.license_short && x.license_url);
  Object.assign(e, {
    source_type: 'direct-agency',
    title: f.title,
    author: f.author,
    agency: f.agency,
    source_url: f.source_url,
    image_url: f.image_url,
    license_short: f.license_short,
    license_url: twin?.license_url ?? null,
    license_rationale: f.license_rationale ?? twin?.license_rationale ?? '',
    modifications: [...new Set([...(e.modifications ?? []), 'identified-by-image-match'])],
    revid: null,
    pageid: null,
  });
  n++;
  console.log(`  ${path} → ${f.title} · ${f.author} · ${f.license_short}`);
}
if (failed.length) {
  console.error(failed.join('\n'));
  process.exit(1);
}
if (!dry) writeFileSync(FILE, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${dry ? 'would rebuild' : 'rebuilt'} ${n} rows`);
