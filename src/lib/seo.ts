/**
 * SEO URL helpers — canonical + hreflang.
 *
 * Canonical + hreflang tags always point at the PRODUCTION origin, so prod
 * is the authoritative copy and the sitemap and the on-page tags agree
 * byte-for-byte. The GH Pages staging mirror emits noindex instead (see
 * `isMirrorBuild`).
 *
 * URL shape mirrors scripts/gh-pages-compat.mjs#expandLocalizedRoots and
 * the Paraglide URL-segment strategy: en-US at the bare path, every other
 * locale under `/<locale>`.
 */
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale, type LocaleCode } from '$lib/locale';

/** Canonical public origin — production host, no trailing slash. */
export const SITE_ORIGIN = 'https://www.orrerylearn.com';

/**
 * True for a build served under a base path — the GH Pages staging mirror
 * (`VITE_BASE=/orrery/`, staging.yml). Prod, Docker and the native apps build
 * with no base. Google indexed the mirror (it outranked prod) even though its
 * canonical pointed at prod — a canonical is only a hint — so the mirror says
 * noindex and leaves out canonical + hreflang, which would contradict it.
 */
export function isMirrorBuild(base: string): boolean {
  return base !== '';
}

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

/**
 * A meta description of at most `max` characters: whole sentences when they
 * carry enough of the text (a Latin `.!?` counts only before a space, so "1.5"
 * and "e.g." are not ends; CJK `。！？` always count), otherwise cut at a word
 * boundary (or anywhere, for scripts without spaces) with an ellipsis. In
 * spaced scripts a sentence cut must keep 60% of `max` — a lone short first
 * sentence says less than a longer cut; a CJK sentence is dense enough at 40.
 */
export function metaDescription(text: string, max = 160): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max + 1);
  let end = -1;
  for (const m of head.matchAll(/[.!?](?= )|[。！？]/g)) if (m.index < max) end = m.index + 1;
  const spaced = (s.match(/ /g)?.length ?? 0) > s.length / 20;
  if (end >= (spaced ? max * 0.6 : 40)) return s.slice(0, end);
  const room = s.slice(0, max - 1);
  const space = room.lastIndexOf(' ');
  return `${(space >= 40 ? room.slice(0, space) : room).replace(/[\s,;:—–-]+$/u, '')}…`;
}

/**
 * `Main · Section · Orrery`, kept within `max` characters for the results page:
 * a long "Topic — subtitle" (or "Topic: subtitle") main title keeps only its
 * topic, and if that is still too long the section name goes. The H1 and
 * description keep the full text.
 */
export function pageTitle(main: string, section?: string, max = 60): string {
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ');
  const full = join(main, section, 'Orrery');
  if (full.length <= max) return full;
  const topic = main.split(/\s[—–]\s|——|: |：/)[0].trim();
  const short = join(topic, section, 'Orrery');
  return short.length <= max ? short : join(topic, 'Orrery');
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
