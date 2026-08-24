/**
 * measure-mobile-corpus.mjs — audit what a PHONE actually fetches vs what exists.
 *
 * PRD-035 Part 1 / RFC-040 §2. Answers two questions with numbers, not vibes:
 *
 *   1. Over-serve: which served images have NO rung a phone can use (≤1280px),
 *      so a mobile browse fetches desktop-grade pixels? Reported per bucket + MB.
 *   2. Mobile corpus size: the total bytes a phone would cache to hold the whole
 *      image set at its mobile rung (feeds the Part 2 offline tier budget).
 *
 * The srcset ladder (`static/data/image-ladder.json`, built by
 * scripts/vision/build-display-ladder.mjs) maps `/images/<stem>` → the sorted
 * WebP rung widths that exist. The DOM `<img srcset>` picks the ≤viewport rung,
 * so an image is "mobile-OK" iff it has a rung ≤ MOBILE_MAX (its base counts as
 * a rung). hotspots/ are excluded from the ladder by design — they use the
 * surface-scene tier dispatcher (gates on projected screen px), so they're
 * viewport-adaptive already and reported separately, not as over-serve.
 *
 * Read-only. Prints a report; writes nothing. Run: node scripts/mobile/measure-mobile-corpus.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MOBILE_MAX = 1280; // RFC-040 Contract A — a 3× phone's widest full-bleed rung
const SERVED = 'static/images';
const MANIFEST = 'static/data/image-ladder.json';
const EXCLUDE_TOP = new Set(['hotspots', 'posters']); // tier-dispatched / downloadable art

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const bytesOf = (f) => Number(execSync(`stat -f%z "${f}"`).toString().trim());
const widthOf = (f) => {
  const m = execSync(`sips -g pixelWidth "${f}"`)
    .toString()
    .match(/pixelWidth: (\d+)/);
  return m ? Number(m[1]) : 0;
};
const bucketOf = (f) => f.split('/')[2] || '(root)';
const mb = (b) => (b / 1048576).toFixed(1);

// Every served BASE image (unsuffixed .webp/.jpg/.png; not a -<w> rung, not a thumb).
const bases = execSync(
  `find ${SERVED} -type f \\( -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \\) ` +
    `! -name '*-[0-9]*.webp' ! -name '*.1x1.*' ! -name '*.4x3.*' ! -name '*.16x9.*'`,
  { maxBuffer: 1e9 },
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

const overserve = {}; // bucket → {count, bytes}
const hotspots = { count: 0, bytes: 0 };
let mobileCorpusBytes = 0; // bytes to cache the whole set at its mobile rung
let okCount = 0;

for (const f of bases) {
  const top = f.split('/')[2];
  if (top === 'hotspots') {
    hotspots.count++;
    hotspots.bytes += bytesOf(f);
    continue;
  }
  const stem = '/' + f.replace(/^static\//, '').replace(/\.(webp|jpe?g|png)$/i, '');
  const widths = manifest[stem];
  const mobileRung = widths?.filter((w) => w <= MOBILE_MAX).sort((a, b) => b - a)[0];
  if (mobileRung) {
    // Laddered with a usable rung — a phone fetches that rung, not the base.
    okCount++;
    // approximate the mobile-rung bytes as (rung/maxWidth)^2 * baseBytes when the
    // rung file isn't the base; if the rung IS the base (base ≤ MOBILE_MAX), use base.
    const maxW = widths[widths.length - 1];
    const rungFile = mobileRung === maxW ? f : f.replace(/\.webp$/i, `-${mobileRung}.webp`);
    mobileCorpusBytes += bytesOf(rungFile);
    continue;
  }
  if (EXCLUDE_TOP.has(top)) {
    // posters: intentionally full-res downloadable art — not over-serve, but count
    // its bytes toward a Full-tier estimate elsewhere. Skip from over-serve.
    mobileCorpusBytes += bytesOf(f);
    continue;
  }
  // No ladder + base > MOBILE_MAX → genuine mobile over-serve.
  const w = widthOf(f);
  if (w > MOBILE_MAX) {
    const b = bytesOf(f);
    const bk = bucketOf(f);
    overserve[bk] ??= { count: 0, bytes: 0 };
    overserve[bk].count++;
    overserve[bk].bytes += b;
    mobileCorpusBytes += b; // it's what a phone gets today
  } else {
    okCount++;
    mobileCorpusBytes += bytesOf(f);
  }
}

console.log(`\n  Mobile corpus audit (MOBILE_MAX=${MOBILE_MAX}px)\n`);
console.log(`  images already mobile-OK (≤${MOBILE_MAX} rung available): ${okCount}`);
const overTotal = Object.values(overserve).reduce((a, b) => a + b.bytes, 0);
const overCount = Object.values(overserve).reduce((a, b) => a + b.count, 0);
console.log(`\n  OVER-SERVE (no ≤${MOBILE_MAX} rung — a phone fetches >${MOBILE_MAX}px):`);
console.log(`    ${overCount} images · ${mb(overTotal)} MB`);
for (const [bk, v] of Object.entries(overserve).sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`      ${bk.padEnd(16)} ${String(v.count).padStart(4)} imgs · ${mb(v.bytes)} MB`);
}
console.log(`\n  hotspots (tier-dispatched, viewport-adaptive — NOT over-serve):`);
console.log(`    ${hotspots.count} tiles · ${mb(hotspots.bytes)} MB (loaded per-visit, per-zoom)`);
console.log(
  `\n  Mobile-res image corpus (whole set at its mobile rung): ~${mb(mobileCorpusBytes)} MB`,
);
console.log(
  `    (+ hotspots ${mb(hotspots.bytes)} MB if a Full offline tier includes surface tiers)\n`,
);
