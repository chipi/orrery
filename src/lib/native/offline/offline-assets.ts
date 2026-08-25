/**
 * offline-assets — the READ side of the offline feature (RFC-040 §3). Once a tier
 * is downloaded, this resolves a streamed-asset URL to its local Filesystem copy so
 * a cached `<img>`/audio loads offline transparently. Two seams consult it:
 * `assetUrl()` (asset-url.ts) and `ladderSources()` (image-srcset.ts).
 *
 * No-op until `initOfflineResolver()` runs (native, a tier downloaded), and a no-op
 * during SSR/web — so it's safe to import from the low-level asset-url spine.
 */
import { Capacitor } from '@capacitor/core';
import { loadLadder, setOfflineResolver, type LadderManifest } from '$lib/image-srcset';

const MOBILE = 1280;

let cachedSet: Set<string> | null = null; // the downloaded tier's relative URLs
let baseFileUri = ''; // file:// path of the Filesystem `offline/` root
let ladder: LadderManifest = {};

export const isOfflineActive = (): boolean => cachedSet !== null;

/**
 * Arm the resolver from a downloaded tier's URL list. Idempotent; native-only.
 * `tierUrls` are the manifest tier's relative URLs (exactly what was stored).
 */
export async function initOfflineResolver(tierUrls: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || tierUrls.length === 0) return;
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    baseFileUri = (await Filesystem.getUri({ path: 'offline', directory: Directory.Data })).uri;
  } catch {
    return; // no offline root — stay inactive
  }
  ladder = await loadLadder();
  cachedSet = new Set(tierUrls);
  setOfflineResolver(resolveOffline); // arm the image-srcset render seam
}

export function clearOfflineResolver(): void {
  cachedSet = null;
  setOfflineResolver(null);
}

const localUrl = (relUrl: string): string => Capacitor.convertFileSrc(baseFileUri + relUrl);

/** The mobile-rung file path for an image stem, from the ladder (or null). */
function mobileRungPath(stem: string): string | null {
  const widths = ladder[stem];
  if (!widths?.length) return null;
  const maxW = widths[widths.length - 1];
  const rung = widths.filter((w) => w <= MOBILE).sort((a, b) => b - a)[0] ?? maxW;
  return rung === maxW ? `${stem}.webp` : `${stem}-${rung}.webp`;
}

/**
 * If `url` (a full stream URL or a root-relative path) points at an asset stored
 * offline, return a WebView-loadable local URL; else null (caller streams).
 * Maps a base/other-rung image request to the single cached mobile rung.
 */
export function resolveOffline(url: string): string | null {
  if (!cachedSet) return null;
  const m = url.match(/(\/(?:images|audio)\/[^?#]+)/);
  if (!m) return null;
  const rel = m[1];
  if (cachedSet.has(rel)) return localUrl(rel); // thumb / audio / exact rung
  // Image base or a non-cached width → map to the cached mobile rung.
  const stem = rel.replace(/\.(webp|jpe?g|png)$/i, '').replace(/-\d+$/, '');
  const rung = mobileRungPath(stem);
  return rung && cachedSet.has(rung) ? localUrl(rung) : null;
}
