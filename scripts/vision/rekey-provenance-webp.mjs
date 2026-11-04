#!/usr/bin/env node
/**
 * Re-key image-provenance.json for WebP-only display images (RFC-030 / ADR-080).
 *
 * Display base images now ship as `NN.webp` instead of `NN.jpg` (same picture,
 * same source/license — only the served format changed). This mechanically
 * rewrites the `path` of each BASE display entry `.jpg → .webp` — only where the
 * `.webp` is on disk and the `.jpg` is not (a row whose jpg still ships is left
 * alone). Leaves:
 *   - variant thumbnails (`.1x1/.4x3/.16x9.jpg`) — still jpg,
 *   - `hotspots/` tiers — kept as full-res jpg (zoom-critical), EXCEPT rover-route
 *     tiles (`hotspots/<body>/<site>/traverse/`, RFC-030 D5 amendment).
 * Route tiles get the same re-key in the image-alt-text locale files, which key
 * laddered images by their served `.webp` path.
 * No re-fetch, no network — attribution is unchanged. Keeps each file's own
 * indentation so the diff is only the changed paths.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const P = 'static/data/image-provenance.json';
const ALT_DIR = 'static/data/image-alt-text';
const TILE = /^\/images\/hotspots\/[^/]+\/[^/]+\/traverse\/[^/]+\.jpe?g$/i;

const servedAsWebp = (p) =>
  existsSync(`static${p.replace(/\.jpe?g$/i, '.webp')}`) && !existsSync(`static${p}`);

// Only `/images/` display bases — NOT /textures/ (3D surface maps stay jpg),
// NOT variant thumbnails, NOT hotspots/ zoom tiers (route tiles aside).
const isBaseDisplay = (p) =>
  p.startsWith('/images/') &&
  /\.jpe?g$/i.test(p) &&
  !/\.(1x1|4x3|16x9)\./i.test(p) &&
  (!p.includes('/hotspots/') || TILE.test(p)) &&
  !p.includes('/posters/') && // downloadable art stays jpg
  servedAsWebp(p);

/** Indentation of a JSON file as written (first indented line). */
function indentOf(text) {
  const line = text.split('\n')[1] ?? '';
  return line.length - line.trimStart().length || 2;
}

const raw = readFileSync(P, 'utf8');
const data = JSON.parse(raw);
let n = 0;
for (const e of data.entries) {
  if (typeof e.path === 'string' && isBaseDisplay(e.path)) {
    e.path = e.path.replace(/\.jpe?g$/i, '.webp');
    n += 1;
  }
}
if (n) writeFileSync(P, JSON.stringify(data, null, indentOf(raw)) + '\n');

let alt = 0;
for (const f of readdirSync(ALT_DIR).filter((x) => x.endsWith('.json'))) {
  const p = `${ALT_DIR}/${f}`;
  const text = readFileSync(p, 'utf8');
  const map = JSON.parse(text);
  const out = {};
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (TILE.test(k) && servedAsWebp(k)) {
      out[k.replace(/\.jpe?g$/i, '.webp')] = v;
      changed = true;
      alt += 1;
    } else out[k] = v;
  }
  if (changed) writeFileSync(p, JSON.stringify(out, null, indentOf(text)) + '\n');
}
// The traverse route-patch manifests name each tile's image; point them at the
// served WebP base too (the scene strips the extension to find its ladder rung).
let patches = 0;
for (const body of ['mars', 'moon']) {
  const dir = `static/data/${body}-traverses`;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.route-patches.json'))) {
    const p = `${dir}/${f}`;
    const text = readFileSync(p, 'utf8');
    const m = JSON.parse(text);
    let changed = false;
    for (const rp of m.patches ?? []) {
      if (typeof rp.image === 'string' && TILE.test(rp.image) && servedAsWebp(rp.image)) {
        rp.image = rp.image.replace(/\.jpe?g$/i, '.webp');
        changed = true;
        patches += 1;
      }
    }
    if (changed) writeFileSync(p, JSON.stringify(m, null, indentOf(text)) + '\n');
  }
}
console.log(
  `[rekey-provenance] ${n} display .jpg → .webp; ${alt} route-tile alt-text keys; ${patches} route-patch images`,
);
