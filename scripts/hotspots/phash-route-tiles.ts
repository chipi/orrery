#!/usr/bin/env tsx
/**
 * Surgical pHash update for route tiles (compute-phash.ts rewrites the whole cache from
 * masters/ and refuses without a full LFS pull). Re-hashes every tile in the given
 * traverse folders and drops cache keys for tiles no longer on disk.
 *
 *   npx tsx scripts/hotspots/phash-route-tiles.ts mars/curiosity mars/perseverance
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePhash } from '../lib/phash.ts';

const CACHE = 'static/data/image-phashes.json';
const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as { phashes: Record<string, string> };
let set = 0;
let dropped = 0;
for (const rel of process.argv.slice(2)) {
  const prefix = `/images/hotspots/${rel}/traverse/`;
  for (const k of Object.keys(cache.phashes)) {
    if (k.startsWith(prefix) && !existsSync(join('static', k))) {
      delete cache.phashes[k];
      dropped++;
    }
  }
  const dir = join('static', prefix);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.jpg')).sort()) {
    cache.phashes[prefix + f] = await computePhash(join(dir, f));
    set++;
  }
}
writeFileSync(CACHE, JSON.stringify(cache, null, 2) + '\n');
console.log(`phash: ${set} route tiles hashed, ${dropped} stale keys dropped`);
