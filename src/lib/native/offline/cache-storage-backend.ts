/**
 * CacheStorageBackend — offline storage for the installed PWA (PRD-035 Part 3 /
 * RFC-040 §3, approach A). Writes pre-downloaded assets into a dedicated
 * `orrery-offline` Cache Storage bucket; the injected SW handler (static/offline-sw.js)
 * serves them offline. `resolve()` returns null — unlike the native Filesystem
 * backend, there's no URL rewrite; the request URL is unchanged and the SW intercepts.
 *
 * Kept separate from workbox's bounded `orrery-images` (maxEntries: 400) so a full
 * tier isn't LRU-evicted. NOTE (RFC-040): Cache Storage is OS-evictable — durable on
 * Android, quota-limited + reclaimable on iOS PWA (best-effort there).
 */
import { assetUrl } from '$lib/asset-url';
import type { StorageBackend } from './storage-backend';

const CACHE = 'orrery-offline';

export class CacheStorageBackend implements StorageBackend {
  readonly kind = 'cache' as const;
  readonly available = typeof caches !== 'undefined';

  async has(relUrl: string): Promise<boolean> {
    const cache = await caches.open(CACHE);
    return !!(await cache.match(assetUrl(relUrl)));
  }

  async write(relUrl: string, data: Blob): Promise<void> {
    const cache = await caches.open(CACHE);
    // Reconstruct a Response with type + length so the SW serves the right
    // Content-Type and size() can read Content-Length without decoding the blob.
    const res = new Response(data, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Length': String(data.size),
      },
    });
    await cache.put(assetUrl(relUrl), res);
  }

  // The SW serves cached requests transparently — the app URL is not rewritten.
  async resolve(): Promise<string | null> {
    return null;
  }

  async size(): Promise<number> {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    let total = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      const len = res?.headers.get('content-length');
      total += len ? Number(len) : 0;
    }
    return total;
  }

  async clear(): Promise<void> {
    await caches.delete(CACHE);
  }
}
