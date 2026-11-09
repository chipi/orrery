/**
 * Find the real source of every placeholder image credit ("NASA Images search result",
 * "Uncurated / Curated panel image", `curated-no-upstream-record`; the rule validate-gallery-credits
 * counts) in the chosen surfaces. Images are grouped by entity folder; each group searches once
 * (the query the placeholder recorded, plus the entity's name) and every image in it is
 * fingerprinted (lib/image-source.mjs, 64-bit dHash).
 *
 * A match's 1x1 crop gets the same source only when re-cropping the matched image with the
 * gallery recipe (sharp cover/attention) gives the same picture (dHash ≤ 6); otherwise the crop is
 * listed under "crops to check".
 *
 * Results are written as they land (resumable: a group already in --out is skipped):
 *   {matches: {path: {source, id, title, d}}, none: {path: best d}, crops: {path: stem}}
 * Look at every match with d > 4 before applying; then `apply-provenance-nasa.mjs <out>` and
 * `backfill-provenance-commons.ts <out-commons map>` (both read the {source, id} entries).
 *
 * Usage: node scripts/credit-placeholders-find.mjs --surface missions,mars-sites --out <file.json>
 *        [--parallel 2] [--max 8]
 *
 * `--all-crops` (local files only, no network): re-crop the base image of every `.1x1.jpg` of the
 * chosen surfaces (default fleet-galleries) and compare with the shipped crop (dHash ≤ 6). A crop that
 * reproduces gets its base's source: its row is kept (or created when --apply) with the modification
 * `crop-verified-from-base`. One that does not is listed under "not reproducing" and its row is left
 * as it is (never given a source). Without --apply it only prints; --apply writes image-provenance.json.
 *   node scripts/credit-placeholders-find.mjs --all-crops [--surface fleet-galleries] [--apply]
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { dhash, distance } from './lib/dhash.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};
const allCrops = args.includes('--all-crops');
const surfaces = String(opt('surface', allCrops ? 'fleet-galleries' : ''))
  .split(',')
  .filter(Boolean);
const out = opt('out');
const parallel = Number(opt('parallel', 2));
const max = Number(opt('max', 8));
if (!surfaces.length || (!out && !allCrops)) {
  console.error(
    'usage: node scripts/credit-placeholders-find.mjs --surface <a,b> --out <file.json>',
  );
  process.exit(2);
}

const PLACEHOLDER = /search result|uncurated panel image|curated panel image/i;
const isPlaceholder = (e) =>
  PLACEHOLDER.test(e.title ?? '') || (e.modifications ?? []).includes('curated-no-upstream-record');

const rows = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8')).entries;
const byPath = new Map(rows.map((e) => [e.path, e]));
const groups = new Map();
for (const e of rows) {
  const parts = e.path.split('/'); // ['', 'images', surface, entity, file]
  if (!surfaces.includes(parts[2]) || e.path.includes('.1x1.') || !isPlaceholder(e)) continue;
  if (!existsSync(`static${e.path}`)) continue;
  const key = parts.slice(2, -1).join('/');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

const SURFACE_HINT = {
  'mars-sites': 'Mars',
  'moon-sites': 'Moon',
  'small-bodies': '',
  planets: '',
};
function queriesFor(key, list) {
  const entity = key.split('/').pop().replace(/[-_]/g, ' ');
  const qs = new Set();
  for (const e of list) {
    const m = (e.title ?? '').match(/"([^"]+)"/);
    if (m) qs.add(m[1].replace(/^fleet /, ''));
  }
  const hint = SURFACE_HINT[key.split('/')[0]] ?? '';
  qs.add(`${entity} ${hint}`.trim());
  return [...qs];
}

const state = existsSync(out)
  ? JSON.parse(readFileSync(out, 'utf8'))
  : { matches: {}, none: {}, crops: {}, done: [] };
const save = () => writeFileSync(out, JSON.stringify(state, null, 1) + '\n');

async function cropMatches(stem, crop) {
  const meta = await sharp(`static${stem}`).metadata();
  const dim = Math.min(meta.width ?? 800, meta.height ?? 800);
  const mine = await sharp(`static${stem}`)
    .resize(dim, dim, { fit: 'cover', position: 'attention' })
    .png()
    .toBuffer();
  return distance(await dhash(mine), await dhash(readFileSync(`static${crop}`))) <= 6;
}

if (allCrops) {
  const doc = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
  const row = new Map(doc.entries.map((e) => [e.path, e]));
  const verified = [];
  const notReproducing = [];
  const noBase = [];
  const created = [];
  for (const surface of surfaces) {
    for (const entity of readdirSync(`static/images/${surface}`)) {
      for (const f of readdirSync(`static/images/${surface}/${entity}`)) {
        if (!f.endsWith('.1x1.jpg')) continue;
        const crop = `/images/${surface}/${entity}/${f}`;
        const base = crop.replace(/\.1x1\.jpg$/, '.webp');
        const baseRow = row.get(base);
        if (!existsSync(`static${base}`) || !baseRow) {
          noBase.push(crop);
          continue;
        }
        if (!(await cropMatches(base, crop))) {
          notReproducing.push(crop);
          continue;
        }
        verified.push(crop);
        const mod = 'crop-verified-from-base';
        const cur = row.get(crop);
        if (cur) {
          if (!cur.modifications.includes(mod)) cur.modifications.push(mod);
        } else {
          const e = {
            ...baseRow,
            id: createHash('sha256').update(crop).digest('hex').slice(0, 16),
            path: crop,
            modifications: ['cropped-1x1', mod],
          };
          doc.entries.push(e);
          row.set(crop, e);
          created.push(crop);
        }
      }
    }
  }
  console.log(
    `crops: ${verified.length} reproduce from their base (${created.length} rows to create), ` +
      `${notReproducing.length} do not, ${noBase.length} without a base row/file`,
  );
  for (const p of notReproducing) console.log(`NOT REPRODUCING ${p}`);
  for (const p of noBase) console.log(`NO BASE ${p}`);
  if (args.includes('--apply')) {
    writeFileSync('static/data/image-provenance.json', JSON.stringify(doc, null, 2) + '\n');
    console.log('image-provenance.json written');
  }
  process.exit(0);
}
const { findSources } = await import('./lib/image-source.mjs');

const todo = [...groups.entries()].filter(([key]) => !state.done.includes(key));
console.log(
  `${groups.size} groups, ${todo.length} to search, ${[...groups.values()].flat().length} images`,
);
let next = 0;
async function worker() {
  while (next < todo.length) {
    const [key, list] = todo[next++];
    const queries = queriesFor(key, list);
    const { candidates, results } = await findSources({ queries, images: list.map((e) => e.path) });
    for (const { path, best } of results) {
      if (best.d <= max) {
        state.matches[path] = { source: best.source, id: best.id, title: best.title, d: best.d };
        const crop = path.replace(/\.\w+$/, '.1x1.jpg');
        const cropRow = byPath.get(crop);
        if (cropRow && isPlaceholder(cropRow) && existsSync(`static${crop}`)) {
          if (await cropMatches(path, crop))
            state.matches[crop] = { ...state.matches[path], crop: true };
          else state.crops[crop] = path;
        }
      } else state.none[path] = best.d;
    }
    state.done.push(key);
    save();
    const hits = results.filter((r) => r.best.d <= max).length;
    console.log(
      `${key}: ${hits}/${results.length} matched (${candidates} candidates; q: ${queries.join(' | ')})`,
    );
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
const m = Object.values(state.matches);
console.log(
  `done: ${m.filter((x) => !x.crop).length} images matched (${m.filter((x) => x.crop).length} crops follow), ` +
    `${Object.keys(state.none).length} not, ${Object.keys(state.crops).length} crops to check`,
);
