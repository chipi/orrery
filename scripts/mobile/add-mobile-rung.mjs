/**
 * add-mobile-rung.mjs — give the OVER-SERVE images a ≤1280 mobile rung.
 *
 * PRD-035 Part 1 / RFC-040 §2, Slice 2. `measure-mobile-corpus.mjs` finds the
 * images a phone fetches at >1280px because they have no smaller rung (141 across
 * deep-sky / launch-ground / essays / missions, 2026-08). This generates the
 * missing `-1280.webp` for exactly those images and registers it in the ladder
 * manifest so `<img srcset>` serves it to phones.
 *
 * Downscales the SERVED base (not a git-LFS master): the buckets in question have
 * no masters (essays/deep-sky/launch-ground) or only LFS stubs (missions), and a
 * single lanczos step from an already-web-encoded 1360–1920px base to 1280 is
 * visually lossless here — while avoiding the full-corpus-regen / LFS-stub degrade
 * the pipeline guards exist to prevent. Additive + idempotent: only writes a rung
 * that doesn't exist; never touches a base file.
 *
 * Run: node scripts/mobile/add-mobile-rung.mjs           (dry-run: --dry)
 */
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MOBILE = 1280;
const QUALITY = 80;
const SERVED = 'static/images';
const MANIFEST_PATH = 'static/data/image-ladder.json';
const DRY = process.argv.includes('--dry');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const widthOf = (f) => {
  const m = execSync(`sips -g pixelWidth "${f}"`)
    .toString()
    .match(/pixelWidth: (\d+)/);
  return m ? Number(m[1]) : 0;
};

// Same selection as measure-mobile-corpus: served bases, excluding hotspots/posters,
// thumbs and existing rungs — that have NO rung ≤ MOBILE.
const bases = execSync(
  `find ${SERVED} -type f \\( -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \\) ` +
    `! -name '*-[0-9]*.webp' ! -name '*.1x1.*' ! -name '*.4x3.*' ! -name '*.16x9.*'`,
  { maxBuffer: 1e9 },
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

const targets = [];
for (const f of bases) {
  const top = f.split('/')[2];
  if (top === 'hotspots' || top === 'posters') continue;
  const stem = '/' + f.replace(/^static\//, '').replace(/\.(webp|jpe?g|png)$/i, '');
  const widths = manifest[stem];
  const hasMobileRung = widths?.some((w) => w <= MOBILE);
  if (hasMobileRung) continue;
  const w = widthOf(f);
  if (w > MOBILE) targets.push({ file: f, stem, baseWidth: w });
}

console.log(
  `\n  ${targets.length} over-serve images → generating ${MOBILE}px rung${DRY ? ' (DRY)' : ''}\n`,
);

let written = 0;
for (const { file, stem, baseWidth } of targets) {
  const rungFile = file.replace(/\.(webp|jpe?g|png)$/i, `-${MOBILE}.webp`);
  if (existsSync(rungFile)) continue;
  if (!DRY) {
    await sharp(file)
      .resize({ width: MOBILE, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(rungFile);
    // Register in the manifest: widths sorted ascending, base = largest.
    const existing = manifest[stem] ?? [baseWidth];
    manifest[stem] = [...new Set([MOBILE, ...existing, baseWidth])].sort((a, b) => a - b);
  }
  written++;
}

if (!DRY) {
  // Match the canonical build-display-ladder.mjs serialization exactly: single
  // line, insertion order preserved (updated keys in place, new keys appended).
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest) + '\n');
}

console.log(
  `  ${DRY ? 'would write' : 'wrote'} ${written} rungs${DRY ? '' : ` + updated ${MANIFEST_PATH}`}\n`,
);
