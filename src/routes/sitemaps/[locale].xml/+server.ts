// /sitemaps/<locale>.xml — one locale's URLs with their hreflang alternates,
// listed by the /sitemap.xml index. See src/lib/sitemap.ts.
import { error } from '@sveltejs/kit';
import { SUPPORTED_LOCALES, isSupportedLocale } from '$lib/locale';
import { localeSitemapXml } from '$lib/sitemap';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
  SUPPORTED_LOCALES.map(({ code }) => ({ locale: code }));

export const GET: RequestHandler = ({ params }) => {
  if (!isSupportedLocale(params.locale)) throw error(404, 'Unknown locale');
  return new Response(localeSitemapXml(params.locale), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
};
