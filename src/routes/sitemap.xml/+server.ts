// /sitemap.xml — one <loc> per locale × canonical route, on the prod origin.
//
// Prerendered to a static file (adapter-static): the route list comes from
// scripts/site-routes.mjs — the SAME source svelte.config.js uses to seed the
// prerender crawl — so the sitemap can't advertise a URL the build didn't emit,
// nor miss one it did. URLs are absolute prod URLs via $lib/seo#canonicalUrl,
// matching the on-page <link rel="canonical"> exactly.
//
// Declared to search engines via Google Search Console (submit the sitemap) and
// Cloudflare's robots.txt manager — NOT an origin robots.txt, which would
// suppress Cloudflare's managed AI-bot Disallow block.
import { collectCanonicalRoutes } from '../../../scripts/site-routes.mjs';
import { SUPPORTED_LOCALES } from '$lib/locale';
import { canonicalUrl, hreflangAlternates } from '$lib/seo';

export const prerender = true;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET(): Response {
  const routes = collectCanonicalRoutes();

  // One <url> per locale × route, each carrying the FULL reciprocal hreflang set
  // (all locales + x-default) as `xhtml:link` alternates (#519). This is the
  // sitemap channel Google recommends for large multilingual sites — it doubles
  // the on-page <link rel="alternate"> annotations and speeds localized indexing
  // so a search in Russian/German/… surfaces the matching /ru//de/ page. The
  // alternate set is identical to $lib/seo's on-page tags (same helper), so the
  // two can't drift.
  const blocks: string[] = [];
  for (const route of routes) {
    const alternates = hreflangAlternates(route)
      .map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${xmlEscape(a.href)}"/>`,
      )
      .join('\n');
    for (const { code } of SUPPORTED_LOCALES) {
      blocks.push(
        `  <url>\n    <loc>${xmlEscape(canonicalUrl(route, code))}</loc>\n${alternates}\n  </url>`,
      );
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    blocks.join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
}
