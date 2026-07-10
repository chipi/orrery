import { base } from '$app/paths';
import { browser } from '$app/environment';

/**
 * Responsive WebP ladder consumption (RFC-030 D1/D3, ADR-080, #383 Slice 3).
 *
 * `scripts/vision/build-display-ladder.mjs` derives, per non-hotspot image, a
 * set of WebP rungs named by their actual pixel width (`01-1280.webp`,
 * `01-2048.webp`, …) and a manifest (`static/data/image-ladder.json`) mapping
 * `/images/<stem>` → the sorted list of available widths. This module turns a
 * served `.jpg` URL into an `<img srcset>` so the browser fetches the rung its
 * viewport needs — phone → small, desktop → mid, 4K Google-TV → the top rung.
 *
 * Falls back to the plain `.jpg` `src` when the manifest isn't loaded yet or
 * the image has no ladder (e.g. `hotspots/`), so rendering is never blocked.
 */

export type LadderManifest = Record<string, number[]>;

/**
 * Pure: given a served image URL (`…/images/<path>.<ext>`) and the ladder
 * manifest, return the WebP `srcset` + a fallback `src`, or `null` if the image
 * has no ladder. Preserves the URL's origin/base prefix. Unit-tested.
 */
export function srcsetFor(
  url: string,
  manifest: LadderManifest,
): { src: string; srcset: string } | null {
  const m = url.match(/^(.*)(\/images\/.+)\.(?:jpe?g|png|webp)$/i);
  if (!m) return null;
  const [, origin, imagePath] = m;
  const widths = manifest[imagePath];
  if (!widths?.length) return null;
  // The largest width is the unsuffixed base `NN.webp` (the canonical); smaller
  // rungs are width-suffixed `NN-<w>.webp`. Base is also the plain-src fallback.
  const maxW = widths[widths.length - 1];
  const srcset = widths
    .map((w) => `${origin}${imagePath}${w === maxW ? '' : `-${w}`}.webp ${w}w`)
    .join(', ');
  const src = `${origin}${imagePath}.webp`;
  return { src, srcset };
}

let cache: LadderManifest | null = null;
let inflight: Promise<LadderManifest> | null = null;

/** Load + cache the ladder manifest once. Safe to call from many components. */
export async function loadLadder(): Promise<LadderManifest> {
  // No manifest fetch during SSR — the relative URL has no base origin in Node
  // and would poison the module cache with an empty manifest for later requests.
  if (!browser) return {};
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(`${base}/data/image-ladder.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LadderManifest>) : {}))
      .then((m) => (cache = m))
      .catch(() => (cache = {}));
  }
  return inflight;
}

/**
 * Sync accessor for render code: returns the `srcset`/`src` pair if the manifest
 * is already loaded and the image has a ladder, else `null` (caller falls back
 * to the plain `<img src>`). Reactive callers re-run once `loadLadder` resolves.
 */
export function ladderSources(url: string): { src: string; srcset: string } | null {
  return cache ? srcsetFor(url, cache) : null;
}
