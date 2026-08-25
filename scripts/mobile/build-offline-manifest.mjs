/**
 * build-offline-manifest.mjs — emit the offline download manifest (PRD-035 Part 2
 * / RFC-040 §3 Contract C). Two tiers of relative asset URLs + byte totals the
 * download engine iterates into the StorageBackend.
 *
 * Role-based split (operator model, 2026-08-25) — "the first few levels of
 * interaction":
 *   BASIC — browse every list + open every detail: the HERO image (mobile rung) +
 *           the HERO thumbnail of every item, across ALL buckets (planets, missions,
 *           fleet, sites, …), plus poster thumbnails. NO galleries, NO full posters,
 *           NO audio, NO surface tiles.
 *   FULL  — everything: all gallery images (02+) + their thumbs, full-size posters,
 *           surface hotspot tiles, and all audio.
 *
 * "Hero" = slot 01 by default, or the slot named in `<bucket>-hero-overrides.json`.
 * Images resolve to their MOBILE RUNG (≤1280 file if one exists, else the base) —
 * the same pixels `<img srcset>` serves. URLs are RELATIVE; the engine prepends the
 * runtime STREAM_ORIGIN. Output: static/data/offline-manifest.json.
 *
 * Run: node scripts/mobile/build-offline-manifest.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MOBILE = 1280;
const SERVED = 'static/images';
const LADDER = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8'));
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;

// hero-override files → the image bucket they govern.
const OVERRIDE_BUCKET = {
  planets: 'planets',
  missions: 'missions',
  fleet: 'fleet-galleries',
  'mars-sites': 'mars-sites',
  'moon-sites': 'moon-sites',
  'small-bodies': 'small-bodies',
  satellites: 'satellites',
};
// bucket → { item → heroStem } (e.g. "05.jpg" → "05"). Default hero stem is "01".
const heroOverride = {};
for (const [name, bucket] of Object.entries(OVERRIDE_BUCKET)) {
  const p = `static/data/${name}-hero-overrides.json`;
  if (!existsSync(p)) continue;
  const { overrides = {} } = JSON.parse(readFileSync(p, 'utf8'));
  heroOverride[bucket] = {};
  for (const [item, o] of Object.entries(overrides)) {
    if (o?.slot) heroOverride[bucket][item] = o.slot.replace(/\.\w+$/, '');
  }
}

const FULL_ONLY_BUCKETS = new Set(['hotspots', 'posters']); // tiles / downloadable art
const SKIP_BUCKETS = new Set(['_staging']);
const bytesOf = (f) => Number(execSync(`stat -f%z "${f}"`).toString().trim());
const mb = (b) => (b / 1048576).toFixed(1);

/** Served base file → mobile-rung RELATIVE url + bytes. */
function mobileRung(file) {
  const rel = '/' + file.replace(/^static\//, '');
  const stem = rel.replace(/\.(webp|jpe?g|png)$/i, '');
  const widths = LADDER[stem];
  if (widths?.length) {
    const maxW = widths[widths.length - 1];
    const rung = widths.filter((w) => w <= MOBILE).sort((a, b) => b - a)[0] ?? maxW;
    const url = rung === maxW ? `${stem}.webp` : `${stem}-${rung}.webp`;
    return { url, bytes: bytesOf('static' + url) };
  }
  return { url: rel, bytes: bytesOf(file) };
}

/** Is this served base image the HERO of its item (→ Basic)? */
function isHero(file) {
  const parts = file.split('/'); // static images bucket ...rest
  const bucket = parts[2];
  const name = parts[parts.length - 1].replace(/\.(webp|jpe?g|png)$/i, '');
  if (!/^\d+$/.test(name)) return true; // flat single-image item = its own hero
  const item = parts[parts.length - 2]; // gallery folder
  const heroStem = heroOverride[bucket]?.[item] ?? '01';
  return name === heroStem;
}

const basic = [];
const full = [];
const tally = { basicBytes: 0, fullBytes: 0, thumbs: 0, audio: 0 };

// 1 · base images (heroes → Basic + Full; gallery 02+ → Full only)
const bases = execSync(
  `find ${SERVED} -type f \\( -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \\) ` +
    `! -name '*-[0-9]*.webp' ! -name '*.1x1.*' ! -name '*.thumb.*' ! -name '*.4x3.*' ! -name '*.16x9.*'`,
  { maxBuffer: 1e9 },
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

for (const f of bases) {
  const bucket = f.split('/')[2];
  if (SKIP_BUCKETS.has(bucket)) continue;
  const { url, bytes } = mobileRung(f);
  full.push(url);
  tally.fullBytes += bytes;
  // posters: full art is Full-only (its thumb goes to Basic below). hotspots: tiles, Full.
  if (!FULL_ONLY_BUCKETS.has(bucket) && isHero(f)) {
    basic.push(url);
    tally.basicBytes += bytes;
  }
}

// 2 · thumbnails: hero thumb (01/single/override + poster .thumb) → Basic; gallery → Full
const thumbs = execSync(`find ${SERVED} -type f \\( -name '*.1x1.*' -o -name '*.thumb.*' \\)`, {
  maxBuffer: 1e9,
})
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

for (const f of thumbs) {
  const bucket = f.split('/')[2];
  if (SKIP_BUCKETS.has(bucket)) continue;
  const rel = '/' + f.replace(/^static\//, '');
  const b = bytesOf(f);
  full.push(rel);
  tally.fullBytes += b;
  const base = f.replace(/\.(1x1|thumb)\.\w+$/i, '.webp'); // the base this thumb belongs to
  const isPosterThumb = /\.thumb\.\w+$/i.test(f);
  if (isPosterThumb || isHero(base)) {
    basic.push(rel);
    tally.basicBytes += b;
    tally.thumbs += b;
  }
}

// 3 · audio → Full only (narration + tours)
for (const f of execSync(`find static/audio -type f`, { maxBuffer: 1e9 })
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean)) {
  full.push('/' + f.replace(/^static\//, ''));
  tally.fullBytes += bytesOf(f);
  tally.audio += bytesOf(f);
}

writeFileSync(
  'static/data/offline-manifest.json',
  JSON.stringify({
    version: VERSION,
    basic: { bytes: tally.basicBytes, urls: basic },
    full: { bytes: tally.fullBytes, urls: full },
  }) + '\n',
);

console.log(`\n  offline-manifest.json · v${VERSION}\n`);
console.log(
  `  BASIC: ${basic.length} files · ${mb(tally.basicBytes)} MB  (heroes + hero thumbs, every bucket)`,
);
console.log(`         hero thumbnails ${mb(tally.thumbs)} MB of that`);
console.log(
  `  FULL:  ${full.length} files · ${mb(tally.fullBytes)} MB  (+ galleries, full posters, tiles, audio ${mb(tally.audio)} MB)\n`,
);
