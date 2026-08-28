/**
 * SEO URL helpers — canonical + hreflang.
 *
 * Every deployment (prod VPS, GH Pages staging, Docker, localhost) points
 * its canonical + hreflang tags at the PRODUCTION origin. That makes prod
 * the authoritative copy and stops the staging mirror from competing for
 * Google's index — a staging page canonicalises to its prod twin rather
 * than self-referencing. Absolute prod URLs also mean the sitemap and the
 * on-page tags agree byte-for-byte.
 *
 * URL shape mirrors scripts/gh-pages-compat.mjs#expandLocalizedRoots and
 * the Paraglide URL-segment strategy: en-US at the bare path, every other
 * locale under `/<locale>`.
 */
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale, type LocaleCode } from '$lib/locale';

/** Canonical public origin — production host, no trailing slash. */
export const SITE_ORIGIN = 'https://www.orrerylearn.com';

/**
 * Reduce a live pathname to its un-localized canonical route.
 *
 * Strips the SvelteKit base prefix (`''` on prod, `/orrery` on GH Pages)
 * and any leading locale segment, so `/orrery/de/missions` → `/missions`
 * and `/de/` → `/`. Query strings are the caller's concern (pass
 * `url.pathname`, never `url.href`) — canonical URLs never carry them.
 */
export function canonicalRoute(pathname: string, base = ''): string {
  let p = pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  if (!p.startsWith('/')) p = `/${p}`;
  const parts = p.split('/');
  // parts[0] is '' (leading slash); parts[1] is the first real segment.
  // en-US never appears as a prefix, so any supported-locale first segment
  // is a locale prefix to strip.
  if (isSupportedLocale(parts[1]) && parts[1] !== DEFAULT_LOCALE) {
    parts.splice(1, 1);
  }
  const out = parts.join('/');
  return out === '' ? '/' : out;
}

/** Locale-prefixed path for a canonical route (no origin, no base). */
export function localizedPath(route: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return route;
  return route === '/' ? `/${locale}/` : `/${locale}${route}`;
}

/** Absolute production URL for a canonical route in a given locale. */
export function canonicalUrl(route: string, locale: LocaleCode): string {
  return SITE_ORIGIN + localizedPath(route, locale);
}

export interface HreflangAlternate {
  /** BCP-47 hreflang value (locale codes are already valid tags). */
  hreflang: string;
  href: string;
}

/**
 * The full reciprocal hreflang set for a canonical route: one entry per
 * supported locale plus `x-default` → en-US. Emitted identically on every
 * locale's copy of the page, which satisfies Google's reciprocity rule.
 */
export function hreflangAlternates(route: string): HreflangAlternate[] {
  const alts: HreflangAlternate[] = SUPPORTED_LOCALES.map((l) => ({
    hreflang: l.code,
    href: canonicalUrl(route, l.code),
  }));
  alts.push({ hreflang: 'x-default', href: canonicalUrl(route, DEFAULT_LOCALE) });
  return alts;
}
