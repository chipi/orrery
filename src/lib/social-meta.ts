/**
 * Open Graph + Twitter card tags for every prerendered page, derived from the
 * page's own <title>, meta description and canonical — so no route has to
 * repeat them. Applied in hooks.server.ts (transformPageChunk) at prerender
 * time. A page that already emits og:title (the /c/* card stubs) is left as
 * is; a page that emits its own og:image keeps it.
 */
import { DEFAULT_LOCALE, isSupportedLocale } from '$lib/locale';
import { SITE_ORIGIN } from '$lib/seo';

/** 1200×630 crop of the landing hero (original work, see original-work.json). */
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/images/og-default.jpg`;

/** Long-form reading pages: one essay, one program, one science section. */
function isArticle(canonical: string): boolean {
  let path = canonical.startsWith(SITE_ORIGIN) ? canonical.slice(SITE_ORIGIN.length) : canonical;
  const first = path.split('/')[1];
  if (isSupportedLocale(first) && first !== DEFAULT_LOCALE) path = path.slice(first.length + 1);
  return /^\/(?:essays\/[^/]+|programs\/[^/]+|science\/[^/]+\/[^/]+)$/.test(path);
}

function attr(text: string): string {
  return text.replace(/"/g, '&quot;');
}

/** The page title without the trailing brand (" · Orrery", " — Orrery"). */
export function ogTitle(title: string): string {
  return title.replace(/\s*[·|—–-]\s*Orrery\s*$/u, '');
}

export function addSocialMeta(html: string, imageAlt: string): string {
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) return html;
  const head = html.slice(0, headEnd);
  if (head.includes('property="og:title"')) return html;
  const title = head.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) return html;
  const description = head.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const canonical = head.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const ownImage = head.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
  const image = ownImage ?? DEFAULT_OG_IMAGE;
  const t = attr(ogTitle(title));

  const tags = [
    `<meta property="og:type" content="${canonical && isArticle(canonical) ? 'article' : 'website'}"/>`,
    `<meta property="og:site_name" content="Orrery"/>`,
    `<meta property="og:title" content="${t}"/>`,
    description ? `<meta property="og:description" content="${description}"/>` : '',
    canonical ? `<meta property="og:url" content="${canonical}"/>` : '',
    ownImage
      ? ''
      : [
          `<meta property="og:image" content="${image}"/>`,
          `<meta property="og:image:width" content="1200"/>`,
          `<meta property="og:image:height" content="630"/>`,
          `<meta property="og:image:alt" content="${attr(imageAlt)}"/>`,
        ].join(''),
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${t}"/>`,
    description ? `<meta name="twitter:description" content="${description}"/>` : '',
    `<meta name="twitter:image" content="${image}"/>`,
    ownImage ? '' : `<meta name="twitter:image:alt" content="${attr(imageAlt)}"/>`,
  ].join('');

  return html.slice(0, headEnd) + tags + html.slice(headEnd);
}
