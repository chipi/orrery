#!/usr/bin/env tsx
/**
 * Surgical pHash update for route tiles (compute-phash.ts rewrites the whole cache from
 * masters/ and refuses without a full LFS pull). Hashes each served tile of the given
 * traverse folders from its master (masters/hotspots/<rel>/traverse/<id>.jpg — the same
 * source compute-phash uses), keyed by the provenance path /images/…/<id>.jpg, and drops
 * keys for tiles no longer served (neither the WebP base nor a JPEG on disk).
 *
 *   npx tsx scripts/hotspots/phash-route-tiles.ts mars/curiosity mars/perseverance
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePhash } from '../lib/phash.ts';

const CACHE = 'static/data/image-phashes.json';
const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as { phashes: Record<string, string> };
const served = (key: string) =>
  existsSync(join('static', key)) || existsSync(join('static', key.replace(/\.jpg$/, '.webp')));
const isStub = (p: string) =>
  readFileSync(p).subarray(0, 40).toString('utf8').startsWith('version https://git-lfs');
let set = 0;
let dropped = 0;
for (const rel of process.argv.slice(2)) {
  const prefix = `/images/hotspots/${rel}/traverse/`;
  for (const k of Object.keys(cache.phashes)) {
    if (k.startsWith(prefix) && !served(k)) {
      delete cache.phashes[k];
      dropped++;
    }
  }
  const masters = join('masters', 'hotspots', rel, 'traverse');
  for (const f of readdirSync(masters)
    .filter((x) => x.endsWith('.jpg'))
    .sort()) {
    const key = prefix + f;
    if (!served(key)) continue;
    const src = join(masters, f);
    if (isStub(src)) throw new Error(`${src} is an LFS stub — git lfs pull -I '${src}' -X ''`);
    cache.phashes[key] = await computePhash(src);
    set++;
  }
}
writeFileSync(CACHE, JSON.stringify(cache, null, 2) + '\n');
console.log(`phash: ${set} route tiles hashed, ${dropped} stale keys dropped`);
