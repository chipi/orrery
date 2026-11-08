// /sitemap.xml — the sitemap index: one entry per locale, pointing at
// /sitemaps/<locale>.xml (src/lib/sitemap.ts has the why). One 7 MB file with
// every locale became 14 files of ~0.5 MB.
//
// Declared to search engines via Google Search Console (submit the sitemap) and
// the repo robots.txt's Sitemap line (Cloudflare prepends its managed block).
import { sitemapIndexXml } from '$lib/sitemap';

export const prerender = true;

export function GET(): Response {
  return new Response(sitemapIndexXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
}
