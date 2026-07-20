/**
 * Walk every base .jpg under static/images/, compute its DCT
 * perceptual hash, and write the result to static/data/image-phashes.json.
 *
 * Output shape:
 *
 *   {
 *     "computed_at": "2026-06-14T...",
 *     "algorithm": "phash-dct-8x8",
 *     "phashes": {
 *       "/images/missions/apollo11/01.jpg": "f9c8...",
 *       …
 *     }
 *   }
 *
 * Incremental: re-running re-uses the existing cache and only re-hashes
 * paths whose mtime is newer than the cache's `computed_at`. Bulk re-run
 * via `--force`.
 *
 * The cache feeds two downstream consumers:
 *   - scripts/validate-image-phash-dupes.ts (preflight detective)
 *   - scripts/source-known-gaps.ts (pre-write check at sourcing-time)
 *
 * Cost on the current ~2000-image corpus: ~10-15 s wall-clock. Sharp's
 * 32×32 resize is ~5 ms per image; the DCT itself is ~0.5 ms.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePhash } from './lib/phash.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Phash the SOURCE images (masters), so the cache is stable across derived
// re-encodes (RFC-030). masters are byte-identical to the original static/images
// base jpgs, so the cache keys (`/images/...`) + phashes are unchanged. Masters
// are git-LFS `fetchexclude`d — run `git lfs pull -I 'masters/**'` before regen.
const IMAGES_DIR = join(ROOT, 'masters');
const CACHE_PATH = join(ROOT, 'static/data/image-phashes.json');

interface PhashCache {
  computed_at: string;
  algorithm: 'phash-dct-8x8';
  phashes: Record<string, string>;
}

function* walkBaseJpgs(dir: string): Iterable<string> {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkBaseJpgs(full);
    } else if (
      ent.isFile() &&
      ent.name.endsWith('.jpg') &&
      !ent.name.includes('.1x1.') &&
      !ent.name.includes('.4x3.') &&
      !ent.name.includes('.16x9.')
    ) {
      yield full;
    }
  }
}

function loadCache(): PhashCache {
  if (existsSync(CACHE_PATH)) {
    try {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    } catch {
      // corrupted / older shape — fall through to fresh.
    }
  }
  return { computed_at: '1970-01-01T00:00:00.000Z', algorithm: 'phash-dct-8x8', phashes: {} };
}

function urlPathOf(diskPath: string): string {
  // `/images/<rel>` regardless of whether IMAGES_DIR is static/images or masters.
  return '/images' + diskPath.slice(IMAGES_DIR.length);
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const cache = loadCache();
  // Capture the committed entry count BEFORE --force wipes the working set —
  // the shrink guard below compares against this, so a --force rebuild that
  // degrades is still caught (previously --force zeroed the count → guard dead).
  const priorCount = Object.keys(cache.phashes).length;
  if (force) cache.phashes = {};
  const cacheCutoff = new Date(cache.computed_at).getTime();
  const startedAt = new Date();

  let kept = 0;
  let computed = 0;
  let failed = 0;
  const fresh: Record<string, string> = {};

  // ── Guard: masters/ must be smudged (real bytes, not LFS pointer stubs) ──
  // This script REWRITES the whole phash cache from masters/, and masters/**
  // is `fetchexclude`d (.lfsconfig) — so on an un-pulled tree every file is a
  // ~130-byte pointer stub that fails to hash and silently drops from the
  // cache (2560 → 5 in the 2026-07-20 incident). The ladder builder guards
  // this; this script didn't. Abort with the fix instead of degrading.
  {
    let sampled = 0;
    let stubs = 0;
    for (const disk of walkBaseJpgs(IMAGES_DIR)) {
      if (readFileSync(disk).subarray(0, 40).toString('utf8').startsWith('version https://git-lfs'))
        stubs++;
      if (++sampled >= 40) break;
    }
    if (stubs > 0) {
      console.error(
        `✗ masters/ not smudged — ${stubs}/${sampled} sampled files are LFS pointer stubs.\n` +
          `  This script rewrites the whole phash cache from masters/; running it now would\n` +
          `  drop every un-pulled entry. To regenerate: git lfs pull -I 'masters/**' then retry.\n` +
          `  To add a few images, edit static/data/image-phashes.json surgically instead.`,
      );
      process.exit(1);
    }
  }

  for (const disk of walkBaseJpgs(IMAGES_DIR)) {
    const urlPath = urlPathOf(disk);
    const mtime = statSync(disk).mtimeMs;
    const cached = cache.phashes[urlPath];
    if (!force && cached && mtime < cacheCutoff) {
      fresh[urlPath] = cached;
      kept++;
      continue;
    }
    try {
      fresh[urlPath] = await computePhash(disk);
      computed++;
    } catch (err) {
      console.error(`✘ ${urlPath} — ${(err as Error).message}`);
      failed++;
    }
  }

  const out: PhashCache = {
    computed_at: startedAt.toISOString(),
    algorithm: 'phash-dct-8x8',
    phashes: Object.fromEntries(Object.entries(fresh).sort(([a], [b]) => a.localeCompare(b))),
  };

  // ── Backstop: refuse to write a cache that drops a large share of entries ──
  // Root-cause-agnostic — catches stub degradation, a bad walk, anything that
  // would shrink the committed cache. Bypass with --allow-shrink for a real
  // prune. (2026-07-20: silent 2560→5 shrink shipped before this existed.)
  const newCount = Object.keys(out.phashes).length;
  if (!process.argv.includes('--allow-shrink') && priorCount > 50 && newCount < priorCount * 0.9) {
    console.error(
      `✗ refusing to write: ${newCount} entries vs ${priorCount} existing — a ` +
        `${Math.round((1 - newCount / priorCount) * 100)}% drop (degraded-regen signature).\n` +
        `  Pull masters (git lfs pull -I 'masters/**') and retry, or pass --allow-shrink if intentional.`,
    );
    process.exit(1);
  }
  writeFileSync(CACHE_PATH, JSON.stringify(out, null, 2) + '\n');

  const total = Object.keys(out.phashes).length;
  const elapsedMs = Date.now() - startedAt.getTime();
  console.log(
    `pHash cache → static/data/image-phashes.json — ${total} entries ` +
      `(${computed} computed, ${kept} reused, ${failed} failed) in ${(elapsedMs / 1000).toFixed(1)}s`,
  );
  if (failed > 0) process.exit(1);
}

void main();
