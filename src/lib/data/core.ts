/**
 * Data-client core — the fetch + cache + i18n-overlay keystone (ADR-006, ADR-017,
 * ADR-084). Every `$lib/data/` submodule (and the `data.ts` barrel) loads data
 * through `get<T>()` here; this is the single source of the caching contract.
 * Do NOT duplicate the cache or the i18n-bundle resolution elsewhere.
 *
 * Files are served from /data/ at runtime (static/data/ on disk; SvelteKit
 * copies static/ to build/ root). When the base path is set (e.g. /orrery for
 * GitHub Pages) URLs are prefixed automatically via $app/paths.
 */

import { base } from '$app/paths';
import { localeBundleOrigin } from '../asset-url';

export type FetchLike = typeof fetch;

const cache = new Map<string, unknown>();

// Per-locale i18n overlay bundles. The overlay system ships ~740 tiny JSON
// files per locale (~10,360 across 14 locales); fetching and precaching them
// individually is what stalls the service-worker install on mobile WebKit
// (the 0.6.3-stuck bug). They are built into one bundle per locale
// (scripts/build-i18n-bundles.mjs, served at /data/i18n/{locale}.json). We
// fetch a bundle once and index by each file path relative to the locale dir
// (e.g. "sun.json", "planets/mars.json", "science/orbits/vis-viva.json").
const i18nBundles = new Map<string, Promise<Record<string, unknown>>>();

function loadI18nBundle(locale: string, fetchFn: FetchLike): Promise<Record<string, unknown>> {
  let p = i18nBundles.get(locale);
  if (!p) {
    const url = `${localeBundleOrigin(locale)}/data/i18n/${locale}.json`;
    p = (async () => {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    })();
    // Drop the cached promise on failure so a missing bundle (e.g. `vite dev`
    // before a build emits it) retries and can fall back to per-file fetch.
    p.catch(() => i18nBundles.delete(locale));
    i18nBundles.set(locale, p);
  }
  return p;
}

export async function get<T>(path: string, fetchFn: FetchLike = fetch): Promise<T> {
  // i18n overlays resolve from the per-locale bundle. A genuine miss (key
  // absent from a bundle that DID load) throws so callers en-US fallback
  // fires; a missing bundle (dev without a build) falls through to the
  // legacy per-file fetch below.
  const i18n = /^i18n\/([^/]+)\/(.+)$/.exec(path);
  if (i18n) {
    const [, locale, key] = i18n;
    let bundle: Record<string, unknown> | undefined;
    try {
      bundle = await loadI18nBundle(locale, fetchFn);
    } catch {
      bundle = undefined;
    }
    if (bundle) {
      if (!(key in bundle)) throw new Error(`i18n overlay not found: ${locale}/${key}`);
      return bundle[key] as T;
    }
  }

  const url = `${base}/data/${path}`;
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}

/** Clear the fetch cache + i18n bundles (test isolation). Callers that hold
 *  their own module-level caches must clear those too — see `__resetCache`. */
export function resetCoreCache(): void {
  cache.clear();
  i18nBundles.clear();
}
