/**
 * schema.org JSON-LD for search engines. Pure builders; <JsonLd> puts the
 * result in the page head. A `type="application/ld+json"` block is data, not
 * script, so the hash-mode CSP (svelte.config.js) does not apply to it.
 */
import { SITE_ORIGIN } from '$lib/seo';

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'Orrery',
  url: `${SITE_ORIGIN}/`,
  sameAs: ['https://github.com/chipi/orrery'],
};

export interface Crumb {
  name: string;
  /** Absolute URL. */
  url: string;
}

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function article(a: {
  headline: string;
  description?: string;
  url: string;
  inLanguage: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    ...(a.description ? { description: a.description } : {}),
    url: a.url,
    mainEntityOfPage: a.url,
    inLanguage: a.inLanguage,
    ...(a.image ? { image: a.image } : {}),
    author: ORGANIZATION,
    publisher: ORGANIZATION,
  };
}

export function website(a: { url: string; inLanguage: string; description?: string }) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Orrery',
      url: a.url,
      inLanguage: a.inLanguage,
      ...(a.description ? { description: a.description } : {}),
      publisher: ORGANIZATION,
    },
    { '@context': 'https://schema.org', ...ORGANIZATION },
  ];
}

/** Production-absolute form of a site path or URL (asset helpers may return either). */
export function absoluteUrl(src: string, base = ''): string {
  if (/^https?:\/\//.test(src)) return src;
  const path = base && src.startsWith(base) ? src.slice(base.length) : src;
  return SITE_ORIGIN + (path.startsWith('/') ? path : `/${path}`);
}

/** The <script> element text; `<` is escaped so data can never close the tag. */
export function jsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
