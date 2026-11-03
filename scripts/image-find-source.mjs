/**
 * Find where a shipped image really comes from: search NASA Images and Wikimedia Commons for a
 * subject, fingerprint every candidate (64-bit dHash) and keep the closest per image. A distance
 * of 8 or less is the same picture; look at every match before you credit it (a crop or a
 * re-render can land at 6–8 and still be a different picture).
 *
 * Usage:
 *   node scripts/image-find-source.mjs --q "Galileo spacecraft" [--q …] [--cat "Galileo (spacecraft)" …]
 *        [--pages 3] [--max 8] [--out map.json] <image> [<image> …]
 *
 *   <image>  a path under static/ (`/images/fleet-galleries/galileo/01.webp`) or a file.
 *   --q      NASA Images search (up to --pages × 100 hits) and Commons file search (50 hits).
 *   --cat    Commons category; its files and one level of subcategories.
 *   --out    write {path: {source, id, title, d}} for every match ≤ --max: NASA ids go to
 *            `apply-provenance-nasa.mjs`, Commons titles to `backfill-provenance-commons.ts`.
 *
 * Every placeholder credit at once: credit-placeholders-find.mjs. One candidate: image-match.mjs.
 * Runbook: the orrery-link-health skill (credits).
 */
import { writeFileSync } from 'node:fs';
import { findSources } from './lib/image-source.mjs';

const args = process.argv.slice(2);
const opt = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const queries = opt('q');
const cats = opt('cat');
const pages = Number(opt('pages')[0] ?? 3);
const max = Number(opt('max')[0] ?? 8);
const out = opt('out')[0];
const images = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!images.length || (!queries.length && !cats.length)) {
  console.error(
    'usage: node scripts/image-find-source.mjs --q "<subject>" [--cat "<category>"] <image> …',
  );
  process.exit(2);
}

const { candidates, results } = await findSources({ queries, cats, pages, images });
const map = {};
console.log(`${candidates} candidates`);
for (const { path, a, best: b } of results) {
  const hit = b.d <= max;
  if (hit) map[path] = { source: b.source, id: b.id, title: b.title, d: b.d };
  console.log(
    `${hit ? 'MATCH' : 'none '} d=${String(b.d).padStart(2)} aspect ${a.toFixed(2)}/${(b.a ?? 0).toFixed(2)}  ${path}  ${b.source ?? ''} ${b.id ?? ''}`,
  );
}
if (out) writeFileSync(out, JSON.stringify(map, null, 2) + '\n');
