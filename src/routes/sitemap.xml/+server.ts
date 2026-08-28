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
import { canonicalUrl } from '$lib/seo';

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
  const locs: string[] = [];
  for (const route of routes) {
    for (const { code } of SUPPORTED_LOCALES) {
      locs.push(canonicalUrl(route, code));
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    locs.map((loc) => `  <url><loc>${xmlEscape(loc)}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
}
