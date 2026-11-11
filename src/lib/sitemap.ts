/**
 * Sitemaps — one urlset per locale under /sitemaps/<locale>.xml, listed by a
 * sitemap index at /sitemap.xml (the URL robots.txt and Search Console use).
 *
 * The route list comes from scripts/site-routes.mjs — the SAME source
 * svelte.config.js uses to seed the prerender crawl — so a sitemap cannot
 * advertise a URL the build did not emit, nor miss one it did. URLs are prod
 * URLs from $lib/seo, matching the on-page canonical and hreflang tags exactly.
 *
 * No <lastmod>: CI builds from a depth-1 checkout (and .git is not in the
 * Docker context), so per-route dates would all be the build commit's date —
 * Google ignores a lastmod that does not track real changes.
 */
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { SUPPORTED_LOCALES, type LocaleCode } from '$lib/locale';
import { canonicalUrl, hreflangAlternates, SITE_ORIGIN } from '$lib/seo';

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
    return `  <url>\n    <loc>${xmlEscape(canonicalUrl(route, locale))}</loc>\n${alternates}\n  </url>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    blocks.join('\n') +
    `\n</urlset>\n`
  );
}
