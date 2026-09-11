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

// OpenGraph `og:locale` wants `language_TERRITORY`, even for our bare-language
// codes (es, fr, …), and sr-Cyrl needs the script→territory choice made
// deliberately. Explicit map, no guessing (#519).
const OG_LOCALE: Record<string, string> = {
  'en-US': 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  'pt-BR': 'pt_BR',
  it: 'it_IT',
  nl: 'nl_NL',
  'sr-Cyrl': 'sr_RS',
  'zh-CN': 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  hi: 'hi_IN',
  ar: 'ar_AR', // Facebook's generic-Arabic OG locale (not "Arabic (Argentina)") — do not "fix" to ar_SA
  ru: 'ru_RU',
};

/** OpenGraph `og:locale` value for a supported locale (language_TERRITORY). */
export function ogLocale(locale: string): string {
  return OG_LOCALE[locale] ?? locale.replace('-', '_');
}

/** The other supported locales' `og:locale` values, for `og:locale:alternate`. */
export function ogLocaleAlternates(active: string): string[] {
  return SUPPORTED_LOCALES.map((l) => l.code)
    .filter((code) => code !== active)
    .map(ogLocale);
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
