#!/usr/bin/env tsx
/**
 * Snapshot the CURRENT set of pHash near-dupes (≤ THRESHOLD) into
 * static/data/phash-baseline-allowlist.json — the lock-in artefact
 * that lets validate-image-phash-dupes pass preflight today while
 * still failing the build on any NEW near-dupe added tomorrow.
 *
 * The pHash detective was stood up after the corpus had already
 * accumulated ~280 legacy near-dupe pairs from pre-pHash sourcing
 * passes. Cleaning all of them up before wiring the validator into
 * preflight is its own work block. The baseline ratchet ships the
 * validator NOW (regression-blocking) and defers individual cleanup.
 *
 * Run only with INTENT. Re-snapshotting after a sourcing pass would
 * widen the gate to whatever new dupes that pass introduced — which
 * is the opposite of what the baseline exists for. Treat it like
 * pinning a snapshot test, not auto-updating a coverage threshold.
 *
 *   npx tsx scripts/snapshot-phash-baseline.ts
 *
 * Outputs:
 *   static/data/phash-baseline-allowlist.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hammingDistance } from './lib/phash.ts';
import { ALLOWLIST as BYTE_ALLOWLIST } from './validate-image-dupes.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_PATH = resolve(ROOT, 'static/data/image-phashes.json');
const IMAGES_DIR = resolve(ROOT, 'static/images');
const OUT_PATH = resolve(ROOT, 'static/data/phash-baseline-allowlist.json');
const THRESHOLD = 6;

interface Cache {
  phashes: Record<string, string>;
}

function shaPrefixOf(urlPath: string): string | null {
  const disk = join(IMAGES_DIR, urlPath.replace(/^\/images\//, ''));
  try {
    return createHash('sha256').update(readFileSync(disk)).digest('hex').slice(0, 8);
  } catch {
    return null;
  }
}

function main(): void {
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as Cache;
  const entries = Object.entries(cache.phashes);
  const n = entries.length;
  console.log(`Snapshotting pHash baseline — ${n} images, threshold=${THRESHOLD}…`);

  const shaPrefixCache = new Map<string, string | null>();
  const getSha = (p: string): string | null => {
    if (!shaPrefixCache.has(p)) shaPrefixCache.set(p, shaPrefixOf(p));
    return shaPrefixCache.get(p) ?? null;
  };

  // Same skip logic as validate-image-phash-dupes — anything the byte-
  // allowlist already covers doesn't need to be in the pHash baseline.
  const pairs = new Set<string>();
  for (let i = 0; i < n; i++) {
    const [pa, ha] = entries[i];
    for (let j = i + 1; j < n; j++) {
      const [pb, hb] = entries[j];
      const d = hammingDistance(ha, hb);
      if (d > THRESHOLD) continue;
      const shaA = getSha(pa);
      if (shaA && shaA === getSha(pb) && BYTE_ALLOWLIST.has(shaA)) continue;
      const key = ha < hb ? `${ha}|${hb}` : `${hb}|${ha}`;
      pairs.add(key);
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    threshold: THRESHOLD,
    pair_count: pairs.size,
    pairs: Array.from(pairs).sort(),
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ wrote ${OUT_PATH} — ${pairs.size} pair(s)`);
}

main();
