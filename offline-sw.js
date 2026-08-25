/**
 * offline-sw.js — PWA offline serve (PRD-035 Part 3 / RFC-040 §3, approach A).
 *
 * Injected into the workbox `generateSW` service worker via `workbox.importScripts`
 * (vite.config.ts). Serves streamed assets a user pre-downloaded into the dedicated
 * `orrery-offline` cache (written by CacheStorageBackend). Kept separate from
 * workbox's bounded `orrery-images` (maxEntries: 400) so a full tier isn't LRU-evicted.
 *
 * Non-disruptive by construction: it keeps a SYNCHRONOUS in-memory Set of the
 * pathnames currently in the offline cache (read at activate, refreshed on a
 * postMessage from the app after download/remove). The fetch listener calls
 * respondWith ONLY for a pathname in that Set — so a user with no download, and
 * workbox's own runtimeCaching / SWR, are never intercepted (no regression).
 */
const OFFLINE_CACHE = 'orrery-offline';

// Synchronous membership index so the fetch handler can decide without awaiting.
let offlinePaths = new Set();

async function refreshOfflineIndex() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const keys = await cache.keys();
    offlinePaths = new Set(keys.map((req) => new URL(req.url).pathname));
  } catch {
    offlinePaths = new Set();
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(refreshOfflineIndex());
});

// The app pings this after a download completes or offline data is removed.
self.addEventListener('message', (event) => {
  if (event.data === 'orrery-offline-updated') event.waitUntil(refreshOfflineIndex());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let path;
  try {
    path = new URL(request.url).pathname;
  } catch {
    return;
  }
  // Only take over requests we KNOW are in the offline cache — everything else
  // (no download, or not a downloaded asset) falls through to workbox / network.
  if (!offlinePaths.has(path)) return;
  event.respondWith(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.match(request))
      .then((hit) => hit || fetch(request))
      .catch(() => fetch(request)),
  );
});
