/**
 * Sitemaps — one urlset per locale under /sitemaps/<locale>.xml, listed by a
 * sitemap index at /sitemap.xml (the URL robots.txt and Search Console use).
 *
 * The route list comes from scripts/site-routes.mjs — the SAME source
 * svelte.config.js uses to seed the prerender crawl — so a sitemap cannot
 * advertise a URL the build did not emit, nor miss one it did. URLs are prod
 * URLs from $lib/seo, matching the on-page canonical and hreflang tags exactly.
 *
 * <lastmod> comes from the committed manifest generated/route-lastmod.json
 * (scripts/build-route-lastmod.mjs, `npm run route-lastmod`, regenerated in the
 * release PR): the date git last changed the files the page is built from.
 * It cannot be computed at build time — CI builds from a depth-1 checkout and
 * .git is not in the Docker context, so every date would be the build commit's,
 * and Google ignores a lastmod that does not track real change. A route missing
 * from the manifest gets NO <lastmod>, never a fabricated one.
 */
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { SUPPORTED_LOCALES, type LocaleCode } from '$lib/locale';
import { canonicalUrl, hreflangAlternates, SITE_ORIGIN } from '$lib/seo';
import manifest from './generated/route-lastmod.json';

export type LastmodEntry = string | ({ '*': string } & Record<string, string>);

/** One manifest value for one locale: a plain date, or the locale's exception, else the default. */
export function pickLastmod(
  entry: LastmodEntry | undefined,
  locale: LocaleCode,
): string | undefined {
  if (entry === undefined) return undefined;
  return typeof entry === 'string' ? entry : (entry[locale] ?? entry['*']);
}

/** YYYY-MM-DD the page's content last changed in this locale, or undefined when unknown. */
export function lastmodFor(route: string, locale: LocaleCode): string | undefined {
  return pickLastmod((manifest as Record<string, LastmodEntry>)[route], locale);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Absolute URL of one locale's sitemap file. */
export function localeSitemapUrl(locale: LocaleCode): string {
  return `${SITE_ORIGIN}/sitemaps/${locale}.xml`;
}

/** The sitemap index: one <sitemap> per locale. */
export function sitemapIndexXml(): string {
  const entries = SUPPORTED_LOCALES.map(
    ({ code }) => `  <sitemap>\n    <loc>${xmlEscape(localeSitemapUrl(code))}</loc>\n  </sitemap>`,
  ).join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries +
    `\n</sitemapindex>\n`
  );
}

/**
 * One locale's urlset: every canonical route in that locale, each carrying the
 * FULL reciprocal hreflang set (all locales + x-default) as xhtml:link
 * alternates (#519) — the same helper as the on-page tags, so they cannot drift.
 */
export function localeSitemapXml(locale: LocaleCode): string {
  const blocks = collectCanonicalRoutes().map((route: string) => {
    const alternates = hreflangAlternates(route)
      .map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${xmlEscape(a.href)}"/>`,
      )
      .join('\n');
    const lastmod = lastmodFor(route, locale);
    const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
    return `  <url>\n    <loc>${xmlEscape(canonicalUrl(route, locale))}</loc>\n${lastmodTag}${alternates}\n  </url>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    blocks.join('\n') +
    `\n</urlset>\n`
  );
}
