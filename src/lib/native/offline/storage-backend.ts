/**
 * StorageBackend — the persistence seam for the offline download (PRD-035 Part 2 /
 * RFC-040 §3 Contract B). The download engine, manifest, progress store and Settings
 * UI are all backend-agnostic; only THIS layer differs per platform:
 *
 *   - FilesystemBackend (native, Capacitor Directory.Data) — durable, shows under
 *     iOS "Documents & Data" / Android "User data", not OS-evictable. The primary.
 *   - CacheStorageBackend (PWA, SW Cache API) — Part 3; same interface, evictable,
 *     iOS-constrained. Slots in without touching the engine.
 *
 * All URLs are the manifest's RELATIVE paths (`/images/...`, `/audio/...`). Each
 * backend maps them into its own store and resolves them back to a URL the WebView
 * can load (so a cached `<img src>` resolves offline transparently).
 */
export interface StorageBackend {
  /** Which backend is active (telemetry / UI copy). */
  readonly kind: 'filesystem' | 'cache';
  /** Is this backend usable on the current platform? */
  readonly available: boolean;
  /** True if this relative URL is already stored (for resume + resolve). */
  has(relUrl: string): Promise<boolean>;
  /** Store the bytes for a relative URL (idempotent — overwrite is fine). */
  write(relUrl: string, data: Blob): Promise<void>;
  /** A WebView-loadable URL for a stored asset, or null if not stored. */
  resolve(relUrl: string): Promise<string | null>;
  /** Total bytes currently stored across all offline data. */
  size(): Promise<number>;
  /** Remove ALL offline data (the "Remove offline data" action). */
  clear(): Promise<void>;
}

/**
 * The active backend for this platform, or null if offline download is unsupported
 * here (e.g. plain web, pre-Part-3). Async because the Filesystem/Cache probes are.
 */
export async function getStorageBackend(): Promise<StorageBackend | null> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { FilesystemBackend } = await import('./filesystem-backend');
    return new FilesystemBackend();
  }
  // Part 3 (PWA): return a CacheStorageBackend when caches + a SW are present.
  return null;
}
