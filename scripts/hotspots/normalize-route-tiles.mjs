/**
 * Brighten a site's rover-route tiles that came out dark (Apollo 17's LROC NAC
 * crops average ~53/255 against ~130 for Apollo 16 and the Mars tiles, and read
 * as near-black squares in the scene).
 *
 * One curve for the WHOLE set, so neighbouring tiles stay matched (a per-tile
 * stretch would give each tile its own brightness): the 1st–99th percentile of
 * every tile's pixels together mapped to 0–255, then a power curve that brings
 * the set's mean to TARGET_MEAN (~the Apollo 16 / Mars tiles) without moving
 * black or white.
 *
 * The untouched crops are kept once under masters/originals/hotspots/<rel>/
 * traverse/; the stretched ones replace masters/hotspots/<rel>/traverse/. Then
 * rebuild the served rungs:
 *   node scripts/vision/build-display-ladder.mjs --only hotspots/<rel>/traverse --force
 *   npx tsx scripts/hotspots/phash-route-tiles.ts <rel>
 *
 *   node scripts/hotspots/normalize-route-tiles.mjs moon/apollo17 [--dry-run]
 */
import sharp from 'sharp';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const rel = process.argv[2];
const DRY = process.argv.includes('--dry-run');
if (!rel || rel.startsWith('--')) throw new Error('usage: normalize-route-tiles.mjs <body>/<site>');
const dir = path.join('masters', 'hotspots', rel, 'traverse');
const keep = path.join('masters', 'originals', 'hotspots', rel, 'traverse');
const files = readdirSync(dir).filter((f) => f.endsWith('.jpg'));

// Read from the kept originals when they exist, so a re-run never stacks stretches.
const src = (f) => (existsSync(path.join(keep, f)) ? path.join(keep, f) : path.join(dir, f));

const hist = new Float64Array(256);
let n = 0;
for (const f of files) {
  const { data, info } = await sharp(src(f))
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  n += info.width * info.height;
}
const pct = (p) => {
  let acc = 0;
  for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= p * n) return v;
  return 255;
};
const lo = pct(0.01);
const hi = pct(0.99);
const scale = 255 / Math.max(1, hi - lo);
const TARGET_MEAN = 120;
let stretchedSum = 0;
for (let v = 0; v < 256; v++)
  stretchedSum += hist[v] * Math.min(255, Math.max(0, (v - lo) * scale));
const meanAfter = stretchedSum / n;
// out = 255·(x/255)^k with k chosen so the stretched mean lands on TARGET_MEAN.
const k = Math.log(TARGET_MEAN / 255) / Math.log(Math.max(1, meanAfter) / 255);
const lut = Buffer.alloc(256);
for (let v = 0; v < 256; v++) {
  const x = Math.min(255, Math.max(0, (v - lo) * scale)) / 255;
  lut[v] = Math.round(255 * Math.pow(x, k));
}
console.log(
  `${rel}: ${files.length} tiles, joint P1=${lo} P99=${hi} → ×${scale.toFixed(2)}, mean ${meanAfter.toFixed(0)} → power ${k.toFixed(2)}`,
);
if (DRY) process.exit(0);

mkdirSync(keep, { recursive: true });
for (const f of files) {
  if (!existsSync(path.join(keep, f))) copyFileSync(path.join(dir, f), path.join(keep, f));
  const { data, info } = await sharp(path.join(keep, f))
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i++) data[i] = lut[data[i]];
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .jpeg({ quality: 92 })
    .toFile(path.join(dir, f));
}
console.log(`stretched ${files.length} masters; originals in ${keep}`);
