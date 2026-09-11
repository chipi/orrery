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

// The per-locale i18n bundle is a single ~1.75 MB fetch — the fragile step. A
// transient client-side failure (aborted nav, flaky mobile network) used to
// drop straight to the dead per-file fallback in get(), 404-bursting and
// silently serving overlay-less (English-fallback) content (#517). Distinguish
// the two failure modes with `.status`: a 4xx (404 = bundle not built in
// `vite dev`, or an unsupported locale) is NOT transient and throws
// immediately; a network error / 5xx IS transient and is retried with short
// backoff before giving up.
const BUNDLE_ATTEMPTS = 3;
const bundleDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Circuit breaker (#521 review L5): during a sustained outage, `.catch` drops the
// cached promise so each subsequent get() would re-run a fresh 3-attempt × 1.75 MB
// cycle — amplifying load on a server that's already failing. After this many
// FULLY-failed cycles for a locale this page-load, stop retrying and reject
// immediately (the caller's en-US fallback still fires). Reset on resetCoreCache.
const BUNDLE_MAX_FAILED_CYCLES = 2;
const bundleFailedCycles = new Map<string, number>();

class BundleLoadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BundleLoadError';
    this.status = status;
  }
}

function loadI18nBundle(locale: string, fetchFn: FetchLike): Promise<Record<string, unknown>> {
  let p = i18nBundles.get(locale);
  if (!p) {
    // Circuit open: too many failed cycles this page-load — don't hammer the
    // origin again, reject immediately so the caller's fallback fires (L5).
    if ((bundleFailedCycles.get(locale) ?? 0) >= BUNDLE_MAX_FAILED_CYCLES) {
      return Promise.reject(new BundleLoadError(`i18n bundle circuit open: ${locale}`));
    }
    const url = `${localeBundleOrigin(locale)}/data/i18n/${locale}.json`;
    p = (async () => {
      let lastErr: BundleLoadError | undefined;
      for (let attempt = 0; attempt < BUNDLE_ATTEMPTS; attempt++) {
        if (attempt > 0) await bundleDelay(200 * 2 ** (attempt - 1)); // 200ms, 400ms
        try {
          const res = await fetchFn(url);
          if (res.ok) return (await res.json()) as Record<string, unknown>;
          // 4xx = not transient (bundle absent / unsupported locale): stop now.
          if (res.status >= 400 && res.status < 500) {
            throw new BundleLoadError(`Failed to fetch ${url}: HTTP ${res.status}`, res.status);
          }
          lastErr = new BundleLoadError(`Failed to fetch ${url}: HTTP ${res.status}`, res.status); // 5xx → retry
        } catch (err) {
          if (err instanceof BundleLoadError && err.status !== undefined) throw err; // 4xx: don't retry
          lastErr = new BundleLoadError(`Failed to fetch ${url}: ${(err as Error).message}`); // network → retry
        }
      }
      throw lastErr ?? new BundleLoadError(`Failed to fetch ${url}`);
    })();
    // Drop the cached promise on failure so a later call retries from scratch —
    // but count the failed cycle so the circuit breaker above can trip. A 4xx
    // (bundle genuinely absent) also counts: no point re-fetching a 404 either.
    p.catch(() => {
      i18nBundles.delete(locale);
      bundleFailedCycles.set(locale, (bundleFailedCycles.get(locale) ?? 0) + 1);
    });
    i18nBundles.set(locale, p);
  }
  return p;
}

// Report a transient bundle-load failure once per locale per session, so the
// real failure rate is measurable (was only inferable from nginx 404s, #517).
// Fire-and-forget; the dynamic import keeps this data keystone dependency-light
// and SSR-safe, and `track()` already no-ops when analytics is disabled/opted
// out (ADR-092).
const reportedBundleFailures = new Set<string>();
function reportI18nBundleFailure(locale: string, status?: number): void {
  if (typeof window === 'undefined') return;
  if (reportedBundleFailures.has(locale)) return;
  reportedBundleFailures.add(locale);
  void import('$lib/analytics')
    .then((m) => m.track('i18n-bundle-load-failed', { locale, status: status ?? null }))
    .catch(() => {});
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
    } catch (err) {
      const status = err instanceof BundleLoadError ? err.status : undefined;
      if (status !== undefined && status >= 400 && status < 500) {
        // Bundle genuinely absent (4xx) — an unsupported locale, or a bundle
        // that was never built. Fall through to the legacy per-file fetch, which
        // also 404s (per-file overlays haven't shipped since the bundle move,
        // ADR-079 D2 / #377 — they live in i18n-src/, never served), so this is
        // just one extra guaranteed 404 that drives the caller's en-US fallback.
        // Harmless + rare (routing only emits supported locales); kept rather
        // than special-cased so non-i18n paths still share the code below.
        bundle = undefined;
      } else {
        // Transient network / 5xx failure that survived retries: do NOT drop to
        // the dead per-file path (guaranteed 404 burst, #517). Report it so the
        // real rate is measured, and rethrow — the caller's en-US fallback fires
        // exactly as it does for a key-miss, with no 404 noise.
        reportI18nBundleFailure(locale, status);
        throw err;
      }
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
  reportedBundleFailures.clear();
  bundleFailedCycles.clear();
}
