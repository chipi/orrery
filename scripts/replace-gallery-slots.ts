/**
 * Replace gallery slots with another picture, end to end, from one reviewed map. For each slot it
 * fetches the original (Wikimedia Commons file or NASA Images item) into masters/, clears the old
 * slot's derivatives, rebuilds the WebP ladder, the 320/640 card rungs and the 1x1 crop, credits
 * the new source, writes the alt text in all 14 locales (and records it as the source of each
 * translation, so translate-alt-text.mjs does not queue it again), sets the vision row by hand
 * (no vision API call), updates the pHash, clears curation/off-subject entries for the old
 * picture and regenerates the /credits thumb.
 *
 * Map: { "<rel e.g. missions/mars2/01>": { source: "commons" | "nasa", id: "<File name | nasa_id>",
 *        focal: [x, y], category, subject, alt: { "<locale>": "<text>" … all 14 },
 *        agency: "<gallery credit label>", author?: "<only when the source's author field is wrong>" } }
 * `agency` is required: the credit tools keep a row's old agency, which belonged to the old picture.
 *
 * Usage: npx tsx scripts/replace-gallery-slots.ts <map.json> [--dry-run]
 * Then: rebuild-gallery-manifests.ts, build-i18n-bundles.mjs, build-offline-manifest.mjs,
 * npm run validate-image-integrity, and look at every replaced slot.
 * Masters of the touched galleries must be smudged: git lfs pull -I 'masters/<rel dir>/**'.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { computePhash } from './lib/phash.ts';
import { generateVariants } from './vision/crop-variants.ts';

const LOCALES = [
  'en-US',
  'ar',
  'de',
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
];
const UA = 'OrreryBuildBot/0.1 (https://github.com/chipi/orrery)';
const [mapPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry-run');
if (!mapPath) {
  console.error('usage: npx tsx scripts/replace-gallery-slots.ts <map.json> [--dry-run]');
  process.exit(2);
}

interface Slot {
  source: 'commons' | 'nasa';
  id: string;
  focal: [number, number];
  category: string;
  subject: string;
  alt: Record<string, string>;
  agency: string;
  author?: string;
  score?: number;
}
const map: Record<string, Slot> = JSON.parse(readFileSync(mapPath, 'utf8'));
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p: string, v: unknown) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Refuse the whole map before touching anything.
const problems: string[] = [];
for (const [rel, s] of Object.entries(map)) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+\/\d\d$/.test(rel)) problems.push(`${rel}: not <surface>/<id>/<NN>`);
  if (!existsSync(`static/images/${rel}.webp`)) problems.push(`${rel}: no served slot to replace`);
  if (s.source !== 'commons' && s.source !== 'nasa')
    problems.push(`${rel}: source must be commons or nasa`);
  if (!s.id || !s.subject || !s.category || !s.agency)
    problems.push(`${rel}: id, subject, category and agency are required`);
  if (!Array.isArray(s.focal) || s.focal.some((v) => !(v >= 0 && v <= 1)))
    problems.push(`${rel}: focal [x, y] in 0..1`);
  for (const l of LOCALES)
    if (!s.alt?.[l]?.trim()) problems.push(`${rel}: alt text missing for ${l}`);
}
if (problems.length) {
  console.error(`✗ map refused:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

async function originalUrl(s: Slot): Promise<string> {
  if (s.source === 'commons') {
    const q = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: `File:${s.id}`,
    });
    const j = await (
      await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: { 'User-Agent': UA } })
    ).json();
    const url = (Object.values(j.query?.pages ?? {})[0] as { imageinfo?: { url: string }[] })
      ?.imageinfo?.[0]?.url;
    if (!url) throw new Error(`Commons has no file ${s.id}`);
    return url;
  }
  const j = await (
    await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(s.id)}`, {
      headers: { 'User-Agent': UA },
    })
  ).json();
  const hrefs: string[] = (j.collection?.items ?? []).map((i: { href: string }) => i.href);
  const pick = ['~orig.', '~large.', '~medium.']
    .map((t) => hrefs.find((h) => h.includes(t) && /\.(jpe?g|png|tiff?)$/i.test(h)))
    .find(Boolean);
  if (!pick) throw new Error(`NASA Images has no image for ${s.id}`);
  return pick.replace(/^http:/, 'https:').replace(/ /g, '%20');
}

const altHash = (t: string) =>
  createHash('sha1').update(String(t)).digest('base64url').slice(0, 10);
const dirs = new Set<string>();
const fetched: Record<string, Buffer> = {};

// 1. Fetch every original first, so a failed download leaves the tree untouched.
for (const [rel, s] of Object.entries(map)) {
  const url = await originalUrl(s);
  await sleep(500);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${rel}: ${url} → HTTP ${res.status}`);
  fetched[rel] = Buffer.from(await res.arrayBuffer());
  const md = await sharp(fetched[rel]).metadata();
  console.log(`  ${rel} ← ${s.source}:${s.id} ${md.width}×${md.height} ${md.format}`);
  dirs.add(dirname(rel));
}
if (DRY) {
  console.log(`dry run: ${Object.keys(map).length} slots fetched, nothing written`);
  process.exit(0);
}

// 2. Masters are NN.jpg (the gallery convention; vision, pHash and the dedup gate key on it): a
// JPEG original is kept byte for byte, anything else is flattened onto black and encoded at q92.
// A JPEG with an EXIF rotation is re-encoded upright: the ladder ignores the flag, so a camera
// photo stored sideways was served sideways (earth-objects/beidou/04, 2026-11-08).
// Then the old derivatives go.
for (const [rel, buf] of Object.entries(fetched)) {
  for (const ext of ['jpg', 'jpeg', 'png']) rmSync(`masters/${rel}.${ext}`, { force: true });
  const { format: fmt, orientation } = await sharp(buf).metadata();
  mkdirSync(dirname(`masters/${rel}`), { recursive: true });
  writeFileSync(
    `masters/${rel}.jpg`,
    fmt === 'jpeg' && (orientation ?? 1) === 1
      ? buf
      : await sharp(buf).rotate().flatten({ background: '#000000' }).jpeg({ quality: 92 }).toBuffer(),
  );
  const dir = `static/images/${dirname(rel)}`;
  const nn = rel.split('/').pop();
  for (const f of readdirSync(dir))
    if (f === `${nn}.webp` || f.startsWith(`${nn}-`) || f === `${nn}.1x1.jpg`) rmSync(join(dir, f));
  rmSync(`static/credit-thumbs/images/${rel}.1x1.webp`, { force: true });
}

// 3. Ladder, card rungs, 1x1 crop (the pipeline's own scripts).
execFileSync(
  'node',
  ['scripts/vision/build-display-ladder.mjs', '--only', [...dirs].join(','), '--force'],
  { stdio: 'inherit' },
);
// Card rungs for these slots only, as add-card-rungs.mjs makes them (its --all walks every
// manifest entry and needs every master smudged): 320 under the smallest rung, and 320 + 640
// under the base for a card hero (the hero override's slot, else 01).
const LADDER = 'static/data/image-ladder.json';
const ladder = readJson(LADDER);
for (const rel of Object.keys(map)) {
  const [surfaceDir, entity, nn] = rel.split('/');
  const surface = surfaceDir === 'fleet-galleries' ? 'fleet' : surfaceDir;
  const ovFile = `static/data/${surface}-hero-overrides.json`;
  const ov = existsSync(ovFile) ? (readJson(ovFile).overrides ?? {}) : {};
  const hero = (ov[entity]?.slot ?? '01.jpg').replace(/\.[^.]+$/, '') === nn;
  const key = `/images/${rel}`;
  const widths: number[] = ladder[key];
  if (!widths?.length) throw new Error(`${rel}: no ladder entry after build-display-ladder`);
  const ceiling = hero ? widths[widths.length - 1] : widths[0];
  const buf = readFileSync(`masters/${rel}.jpg`);
  const added: number[] = [];
  for (const target of hero ? [320, 640] : [320]) {
    if (target >= ceiling || widths.includes(target)) continue;
    const data = await sharp(buf)
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const w = (await sharp(data).metadata()).width ?? target;
    if (w >= ceiling || widths.includes(w) || added.includes(w)) continue;
    writeFileSync(`static${key}-${w}.webp`, data);
    added.push(w);
  }
  ladder[key] = [...new Set([...added, ...widths])].sort((a, b) => a - b);
}
writeJson(LADDER, ladder);
for (const [rel, s] of Object.entries(map)) {
  const master = `masters/${rel}.jpg`;
  await generateVariants({
    sourcePath: master,
    sourceBytes: readFileSync(master),
    focalPoint: { x: s.focal[0], y: s.focal[1] },
    outputBase: `static/images/${rel}`,
    forceRefresh: true,
  });
}

// 4. Credits through the existing tools.
const commons: Record<string, string> = {};
const nasa: Record<string, string> = {};
for (const [rel, s] of Object.entries(map))
  for (const p of [`/images/${rel}.webp`, `/images/${rel}.1x1.jpg`])
    (s.source === 'commons' ? commons : nasa)[p] = s.id;
const tmp = '.cache/replace-gallery-slots';
mkdirSync(tmp, { recursive: true });
if (Object.keys(commons).length) {
  writeJson(`${tmp}/commons.json`, commons);
  execFileSync('npx', ['tsx', 'scripts/backfill-provenance-commons.ts', `${tmp}/commons.json`], {
    stdio: 'inherit',
  });
}
if (Object.keys(nasa).length) {
  writeJson(`${tmp}/nasa.json`, nasa);
  execFileSync('node', ['scripts/apply-provenance-nasa.mjs', `${tmp}/nasa.json`], {
    stdio: 'inherit',
  });
}
const PROV = 'static/data/image-provenance.json';
const prov = readJson(PROV);
for (const e of prov.entries ?? prov) {
  const rel = String(e.path).match(/^\/images\/(.+?)(?:\.webp|\.1x1\.jpg)$/)?.[1];
  const s = rel ? map[rel] : undefined;
  if (!s) continue;
  e.agency = s.agency;
  if (s.author) e.author = s.author;
}
writeJson(PROV, prov);

// 5. Alt text in 14 locales + translation sources.
const SOURCES = 'scripts/i18n-tools/maps/alt-text-sources.json';
const sources = readJson(SOURCES);
for (const l of LOCALES) {
  const f = `static/data/image-alt-text/${l}.json`;
  const j = readJson(f);
  const m = j.entries ?? j;
  for (const [rel, s] of Object.entries(map))
    for (const k of [`/images/${rel}.webp`, `/images/${rel}.1x1.jpg`]) {
      m[k] = s.alt[l];
      if (l === 'en-US') sources[k] = altHash(s.alt['en-US']);
    }
  writeJson(f, j);
}
writeJson(SOURCES, sources);

// 6. Vision rows (set by hand), pHash, curation and off-subject entries for the old picture.
const V = 'static/data/image-vision.json';
const vision = readJson(V);
const P = 'static/data/image-phashes.json';
const phashes = readJson(P);
for (const [rel, s] of Object.entries(map)) {
  const master = `masters/${rel}.jpg`;
  const key = `/images/${rel}.jpg`;
  vision.entries[key] = {
    ...(vision.entries[key] ?? {}),
    // The old row's score rated the old picture; a hand-reviewed replacement passes
    // audit-heroes' threshold (6) unless the map says otherwise.
    score: s.score ?? 8,
    subject: s.subject,
    category: s.category,
    focal_point: { x: s.focal[0], y: s.focal[1] },
    subject_match: true,
    rejected_by: null,
    scored_at: new Date().toISOString(),
    scoring_cost_usd: 0,
  };
  phashes.phashes[key] = await computePhash(master);
}
writeJson(V, vision);
writeJson(P, phashes);
const gone = new Set(Object.keys(map).map((rel) => `/images/${rel}.jpg`));
const C = 'static/data/image-curation.json';
const cur = readJson(C);
const before = cur.entries.length;
cur.entries = cur.entries.filter((e: { path: string }) => !gone.has(e.path));
writeJson(C, cur);
const O = 'static/data/off-subject-review.json';
const off = readJson(O);
const offMap = off.decisions ?? off.entries ?? off;
for (const k of gone) delete offMap[k];
writeJson(O, off);

// 7. /credits thumbs (add-only, the old ones were removed above).
execFileSync('node', ['scripts/vision/build-credit-thumbs.mjs'], { stdio: 'inherit' });
console.log(
  `replaced ${Object.keys(map).length} slots · curation ${before} → ${cur.entries.length}`,
);
