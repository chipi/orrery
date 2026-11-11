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
 *
 * `--find-inside` (implies --all-crops): for a crop the recipe does not reproduce, look for it inside
 * the base at any position and any scale (square window, 100% … 20% of the short side, normalised
 * cross-correlation of 32x32 grayscale; --inside-min, default 0.8: true crops read 0.83-1.0, other pictures 0.73 and below). Found → verified like the others
 * (`crop-verified-from-base`). Not found → "NOT FROM BASE" with the best score; when the crop's row
 * claims the base's source it is flagged ROW CLAIMS BASE SOURCE (reported, never deleted).
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
const allCrops = args.includes('--all-crops') || args.includes('--find-inside');
const surfaces = String(opt('surface', allCrops ? 'fleet-galleries' : ''))
  .split(',')
  .filter(Boolean);
const findInside = args.includes('--find-inside');
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

const T = 32;
const INSIDE_MIN = Number(opt('inside-min', 0.8));
function ncc(a, b) {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}
const gray = async (input, w, h, fit) => {
  const { data, info } = await sharp(input)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .resize(w, h, { fit, kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
/** Best normalised cross-correlation of the crop (square, as a TxT template) against a square
 * window of the base at any position and any scale (window = 100% … 20% of the short side). */
async function findCropInside(base, crop) {
  const tpl = Float32Array.from((await gray(`static${crop}`, T, T, 'fill')).data);
  const meta = await sharp(`static${base}`).metadata();
  const win = new Float32Array(T * T);
  let best = { score: -1 };
  for (let s = 1; s >= 0.2; s *= 0.93) {
    const k = T / (s * Math.min(meta.width, meta.height));
    const g = await gray(
      `static${base}`,
      Math.max(T, Math.round(meta.width * k)),
      Math.max(T, Math.round(meta.height * k)),
      'fill',
    );
    for (let y = 0; y + T <= g.h; y++)
      for (let x = 0; x + T <= g.w; x++) {
        for (let j = 0; j < T; j++)
          for (let i = 0; i < T; i++) win[j * T + i] = g.data[(y + j) * g.w + x + i];
        const score = ncc(win, tpl);
        if (score > best.score)
          best = { score, scale: s, x: x / g.w, y: y / g.h, w: T / g.w, h: T / g.h };
      }
  }
  return best;
}

if (allCrops) {
  const doc = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
  const row = new Map(doc.entries.map((e) => [e.path, e]));
  const verified = [];
  const notReproducing = [];
  const noBase = [];
  const notFromBase = [];
  const foundInside = [];
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
          if (!findInside) {
            notReproducing.push(crop);
            continue;
          }
          const f = await findCropInside(base, crop);
          if (f.score < INSIDE_MIN) {
            notFromBase.push({ crop, ...f });
            continue;
          }
          const how = `found at ${f.scale.toFixed(2)} of short side, x ${f.x.toFixed(2)} y ${f.y.toFixed(2)}, ncc ${f.score.toFixed(3)}`;
          foundInside.push({ crop, how });
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
  if (findInside) {
    console.log(
      `find-inside: ${foundInside.length} found in their base (ncc >= ${INSIDE_MIN}), ${notFromBase.length} NOT FROM BASE`,
    );
    for (const { crop, how } of foundInside) console.log(`FOUND ${crop} ${how}`);
    let claimed = 0;
    for (const n of notFromBase.sort((a, b) => b.score - a.score)) {
      const cur = row.get(n.crop);
      const base = row.get(n.crop.replace(/\.1x1\.jpg$/, '.webp'));
      const claims = cur && cur.source_url === base.source_url;
      if (claims) claimed++;
      console.log(
        `NOT FROM BASE ${n.crop} best ncc ${n.score.toFixed(3)}${claims ? ' ROW CLAIMS BASE SOURCE' : cur ? ' (row has another source)' : ' (no row)'}`,
      );
    }
    console.log(`not from base with a row claiming the base's source: ${claimed}`);
  }
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
