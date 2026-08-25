/**
 * offline-download — the tiered offline download engine + progress store (PRD-035
 * Part 2 / RFC-040 §3). Backend-agnostic: fetches the manifest tier from the stream
 * origin and writes each asset through the active StorageBackend, reporting progress.
 *
 * Idempotent + resumable — skips assets already stored, so a re-run after a drop
 * resumes. Wi-Fi-only by default (@capacitor/network); a large cellular download
 * needs an explicit confirm. The "what's downloaded" state persists in localStorage
 * so Settings reflects it across launches.
 */
import { assetUrl } from '$lib/asset-url';
import { getStorageBackend, type StorageBackend } from './storage-backend';

export type OfflineTier = 'basic' | 'full';
export type OfflineStatus =
  | 'unsupported' // no backend on this platform (plain web, pre-Part-3)
  | 'idle' // supported, nothing downloading
  | 'downloading'
  | 'done'
  | 'error'
  | 'needs-cellular-confirm';

interface Manifest {
  version: string;
  basic: { bytes: number; urls: string[] };
  full: { bytes: number; urls: string[] };
}

const META_KEY = 'orrery.offline.v1';
const CONCURRENCY = 6;

/** Persisted record of a completed download (survives relaunch). */
interface Meta {
  tier: OfflineTier;
  version: string;
  bytes: number;
}
const loadMeta = (): Meta | null => {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || 'null');
  } catch {
    return null;
  }
};
const saveMeta = (m: Meta | null) =>
  m ? localStorage.setItem(META_KEY, JSON.stringify(m)) : localStorage.removeItem(META_KEY);

export const offline = $state({
  status: 'idle' as OfflineStatus,
  /** The tier currently downloaded (or being downloaded), else null. */
  tier: null as OfflineTier | null,
  done: 0,
  total: 0,
  bytesDone: 0,
  bytesTotal: 0,
  error: '' as string,
  backendKind: '' as string,
  /** set when a cellular download is pending user confirmation */
  pendingTier: null as OfflineTier | null,
});

let backend: StorageBackend | null = null;
let cancelled = false;

/** Call once at app start (mobile). Resolves the backend + restores prior state. */
export async function initOffline(): Promise<void> {
  backend = await getStorageBackend();
  if (!backend?.available) {
    offline.status = 'unsupported';
    return;
  }
  offline.backendKind = backend.kind;
  const meta = loadMeta();
  if (meta) {
    offline.tier = meta.tier;
    offline.bytesDone = meta.bytes;
    offline.bytesTotal = meta.bytes;
    offline.status = 'done';
  }
}

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(assetUrl('/offline-manifest.json'), { cache: 'no-store' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

/** Is the current connection metered (cellular)? Best-effort; false on any error. */
async function onCellular(): Promise<boolean> {
  try {
    const { Network } = await import('@capacitor/network');
    const s = await Network.getStatus();
    return s.connected && s.connectionType === 'cellular';
  } catch {
    return false;
  }
}

/**
 * Download a tier. On cellular, returns without downloading and sets
 * `needs-cellular-confirm` unless `allowCellular` is passed (the user tapped
 * "download anyway"). Idempotent: skips assets already stored.
 */
export async function downloadTier(tier: OfflineTier, allowCellular = false): Promise<void> {
  if (!backend?.available) return;
  if (!allowCellular && (await onCellular())) {
    offline.pendingTier = tier;
    offline.status = 'needs-cellular-confirm';
    return;
  }

  cancelled = false;
  offline.pendingTier = null;
  offline.error = '';
  offline.status = 'downloading';
  offline.tier = tier;

  let manifest: Manifest;
  try {
    manifest = await fetchManifest();
  } catch (e) {
    offline.error = `Couldn't load the asset list (${(e as Error).message}).`;
    offline.status = 'error';
    return;
  }

  const { urls, bytes } = manifest[tier];
  offline.total = urls.length;
  offline.bytesTotal = bytes;
  offline.done = 0;
  offline.bytesDone = 0;

  const failures: string[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < urls.length && !cancelled) {
      const url = urls[cursor++];
      try {
        if (await backend!.has(url)) {
          offline.done++;
          continue;
        }
        const res = await fetch(assetUrl(url), { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        await backend!.write(url, blob);
        offline.done++;
        offline.bytesDone += blob.size;
      } catch {
        failures.push(url); // collected; retried once below
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // One retry pass for transient failures.
  for (const url of failures) {
    if (cancelled) break;
    try {
      const res = await fetch(assetUrl(url), { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await backend!.write(url, blob);
      offline.done++;
      offline.bytesDone += blob.size;
    } catch {
      /* leave it — partial tree is still usable */
    }
  }

  if (cancelled) {
    offline.status = 'idle';
    return;
  }
  const stored = await backend.size();
  saveMeta({ tier, version: manifest.version, bytes: stored });
  offline.bytesDone = stored;
  offline.status = 'done';
}

/** Stop an in-flight download (the partial tree stays usable). */
export function cancelDownload(): void {
  cancelled = true;
}

/** Remove ALL offline data. */
export async function removeOffline(): Promise<void> {
  if (!backend) return;
  await backend.clear();
  saveMeta(null);
  offline.tier = null;
  offline.done = 0;
  offline.total = 0;
  offline.bytesDone = 0;
  offline.bytesTotal = 0;
  offline.status = 'idle';
}
