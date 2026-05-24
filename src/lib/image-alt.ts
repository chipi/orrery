/**
 * Locale-aware image alt-text accessor (PRD-007 piece V minimum / GH #257).
 *
 * Today: returns English alt-text for every image. Loaded from
 * `static/data/image-alt-text/en-US.json` which is auto-generated
 * from `image-provenance.json`'s caption fields (see
 * `scripts/build-image-alt-baseline.ts`).
 *
 * Future (#257 v0.9): when a translator drops in
 * `static/data/image-alt-text/<locale>.json` for any locale,
 * screen readers in that locale immediately pick up the localized
 * text — no code change in components.
 *
 * Fallback chain (per image path):
 *   1. Lookup in the requested locale's alt-text file
 *   2. Fallback to en-US
 *   3. Fallback to empty string (so the <img> still validates but
 *      assistive tech announces it as decorative)
 *
 * SSR-safe: works during build-time pre-rendering. Module-level
 * cache keyed by locale so each locale loads at most once.
 */

import enUsAltText from '$data/image-alt-text/en-US.json';

export type AltTextMap = Record<string, string>;

const LOADED_LOCALES = new Map<string, AltTextMap>();
LOADED_LOCALES.set('en-US', enUsAltText as AltTextMap);

/**
 * Synchronous accessor — returns the image's alt-text for the active
 * locale, falling back to en-US, then to empty string.
 *
 * @param imagePath  /images/... path (matches image-provenance.json keys)
 * @param locale    Active locale tag (e.g. 'en-US', 'ja', 'ar')
 */
export function getImageAlt(imagePath: string, locale: string = 'en-US'): string {
  const localised = LOADED_LOCALES.get(locale);
  if (localised && localised[imagePath]) return localised[imagePath];
  const enFallback = LOADED_LOCALES.get('en-US');
  if (enFallback && enFallback[imagePath]) return enFallback[imagePath];
  return '';
}

/**
 * Register a non-English alt-text file. Called by the layout's
 * lang-load hook when a locale switches in. Idempotent.
 */
export function registerLocaleAltText(locale: string, map: AltTextMap): void {
  LOADED_LOCALES.set(locale, map);
}

/** Currently loaded locales — useful for debug + tests. */
export function loadedLocales(): string[] {
  return [...LOADED_LOCALES.keys()];
}
