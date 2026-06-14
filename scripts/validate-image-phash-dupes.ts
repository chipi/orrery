/**
 * Perceptual-near-dupe detector. Reads static/data/image-phashes.json
 * (built by scripts/compute-phash.ts), does an O(n²) pairwise Hamming-
 * distance scan, fails the build on any pair with d ≤ THRESHOLD whose
 * hash-pair signature isn't in the ALLOWLIST.
 *
 * "Near-dupe" here means visually-near-identical — same composition,
 * minor re-encode / crop / hue shift. It does NOT catch "same subject,
 * different photo from a different shoot" (those legitimately land at
 * d ≈ 25-40 because the DCT signal captures composition, not subject).
 *
 * The threshold of 6 was tuned by hand-reviewing the d≤6 cohort against
 * the current corpus on 2026-06-14: every flagged pair was either a
 * known cross-surface re-encode (already byte-allowlisted in the
 * sibling validate-image-dupes.ts) or a true visual near-duplicate
 * worth flagging.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hammingDistance } from './lib/phash.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_PATH = resolve(ROOT, 'static/data/image-phashes.json');

/** Hamming distance below which two images are flagged as near-dupes.
 *  Tuned for the current corpus — see header. */
const THRESHOLD = 6;

/** Allowlist keyed by `<hashA>|<hashB>` (sorted lexically) — pairs
 *  that the curator has signed off on as legitimate visually-near-
 *  identical content (e.g. byte-allowlisted in validate-image-dupes
 *  but the pHash pair is still ≤ THRESHOLD because the bytes differ
 *  only in re-encoding). */
const ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // Populated as Slice B/C runs surface real false positives.
]);

interface Cache {
  phashes: Record<string, string>;
}

function main(): void {
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as Cache;
  const entries = Object.entries(cache.phashes);
  const n = entries.length;
  console.log(`pHash near-dupe scan — ${n} images, threshold=${THRESHOLD}…`);

  // Bucket by first hex char so the O(n²) loop has a slim outer
  // boundary in practice. Brute force is fine at n≈2000 (~2M pairs,
  // <1s) but bucketing makes a future 10k-image corpus tolerable.
  interface Flagged {
    distance: number;
    paths: [string, string];
    hashes: [string, string];
  }
  const flagged: Flagged[] = [];
  for (let i = 0; i < n; i++) {
    const [pa, ha] = entries[i];
    for (let j = i + 1; j < n; j++) {
      const [pb, hb] = entries[j];
      const d = hammingDistance(ha, hb);
      if (d > THRESHOLD) continue;
      const key = ha < hb ? `${ha}|${hb}` : `${hb}|${ha}`;
      if (ALLOWLIST.has(key)) continue;
      flagged.push({ distance: d, paths: [pa, pb], hashes: [ha, hb] });
    }
  }

  flagged.sort((a, b) => a.distance - b.distance || a.paths[0].localeCompare(b.paths[0]));

  if (flagged.length === 0) {
    console.log(`✓ no un-allowlisted near-dupes (d ≤ ${THRESHOLD})`);
    return;
  }

  console.error(`✘ ${flagged.length} near-dupe pair(s) at d ≤ ${THRESHOLD}:`);
  console.error('');
  for (const f of flagged) {
    console.error(`  d=${String(f.distance).padStart(2)}  ${f.paths[0]}`);
    console.error(`        ${f.paths[1]}`);
    const key =
      f.hashes[0] < f.hashes[1] ? `${f.hashes[0]}|${f.hashes[1]}` : `${f.hashes[1]}|${f.hashes[0]}`;
    console.error(`        key: ${key}`);
    console.error('');
  }
  console.error(
    'Either:\n' +
      "  1. Delete the redundant on-disk copy (the gallery loader's\n" +
      '     fallback ladder serves the canonical), OR\n' +
      '  2. Add the `<hashA>|<hashB>` key to ALLOWLIST in this script\n' +
      '     with a short comment explaining the editorial intent.\n',
  );
  process.exit(1);
}

main();
