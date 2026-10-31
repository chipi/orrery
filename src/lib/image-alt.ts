/**
 * Locale-aware image alt-text accessor (PRD-007 piece V minimum / GH #257).
 *
 * Maps are served from `static/data/image-alt-text/<locale>.json`; en-US is
 * auto-generated from `image-provenance.json`'s caption fields (see
 * `scripts/build-image-alt-baseline.ts`), the other locales are partial (only
 * real captions; filenames stay en-US).
 *
 * Fallback chain (per image path):
 *   1. Lookup in the requested locale's alt-text file
 *   2. Fallback to en-US
 *   3. Fallback to empty string (so the <img> still validates but
 *      assistive tech announces it as decorative)
 *
 * The maps are fetched on the first lookup, not imported: the en-US map is
 * ~700 KB and a static import put it in the root layout's chunk on every page
 * (Phase 5, 2026-10-30). The callers (PlaceHero, SiteStoryPanel) render on the
 * client only, and the store is a SvelteMap, so an alt that was '' while its
 * map loaded re-renders once the map arrives.
 */

import { SvelteMap } from 'svelte/reactivity';
import { localeBundleOrigin } from '$lib/asset-url';

export type AltTextMap = Record<string, string>;

const LOADED_LOCALES = new SvelteMap<string, AltTextMap>();
const requested = new Set<string>();

/**
 * Synchronous accessor — returns the image's alt-text for the active
 * locale, falling back to en-US, then to empty string. Starts loading the
 * maps it needs; returns what is loaded so far.
 *
 * @param imagePath  /images/... path (matches image-provenance.json keys)
 * @param locale    Active locale tag (e.g. 'en-US', 'ja', 'ar')
 */
export function getImageAlt(imagePath: string, locale: string = 'en-US'): string {
  if (typeof window !== 'undefined') {
    void loadLocaleAltText('en-US', localeBundleOrigin('en-US'));
    if (locale !== 'en-US') void loadLocaleAltText(locale, localeBundleOrigin(locale));
  }
  const localised = LOADED_LOCALES.get(locale);
  if (localised && localised[imagePath]) return localised[imagePath];
  const enFallback = LOADED_LOCALES.get('en-US');
  if (enFallback && enFallback[imagePath]) return enFallback[imagePath];
  return '';
}

/** Register an alt-text map for a locale. Idempotent. */
export function registerLocaleAltText(locale: string, map: AltTextMap): void {
  requested.add(locale);
  LOADED_LOCALES.set(locale, map);
}

/**
 * Load + register the alt-text map for a locale (client-side, idempotent,
 * best-effort). Fetches `<base>/data/image-alt-text/<locale>.json`; a missing
 * file registers nothing and `getImageAlt` falls back to en-US.
 */
export async function loadLocaleAltText(locale: string, base = ''): Promise<void> {
  if (requested.has(locale)) return;
  requested.add(locale);
  try {
    const res = await fetch(`${base}/data/image-alt-text/${locale}.json`);
    if (res.ok) LOADED_LOCALES.set(locale, (await res.json()) as AltTextMap);
  } catch {
    /* no locale file yet — en-US fallback stands */
  }
}

/** Currently loaded locales — useful for debug + tests. */
export function loadedLocales(): string[] {
  return [...LOADED_LOCALES.keys()];
}
