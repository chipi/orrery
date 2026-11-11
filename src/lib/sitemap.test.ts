import { describe, it, expect } from 'vitest';
import { sitemapIndexXml, localeSitemapXml, localeSitemapUrl } from './sitemap';
import { SITE_ORIGIN } from './seo';
import { SUPPORTED_LOCALES } from './locale';

describe('sitemap index', () => {
  it('lists one sitemap per locale', () => {
    const xml = sitemapIndexXml();
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect((xml.match(/<sitemap>/g) || []).length).toBe(SUPPORTED_LOCALES.length);
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/sitemaps/de.xml</loc>`);
    expect(xml).toContain(`<loc>${localeSitemapUrl('en-US')}</loc>`);
  });
});

describe('locale sitemap (#519 hreflang annotations)', () => {
  it('lists only that locale’s URLs, each with the full reciprocal alternate set', () => {
    const xml = localeSitemapXml('ru');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/ru/</loc>`);
    expect(xml).not.toContain(`<loc>${SITE_ORIGIN}/</loc>`);
    expect(xml).not.toContain(`<loc>${SITE_ORIGIN}/de/`);
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="de"');
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/"/>`,
    );
    const opens = (xml.match(/<url>/g) || []).length;
    expect(opens).toBe((xml.match(/<\/url>/g) || []).length);
    expect((xml.match(/<xhtml:link /g) || []).length).toBe(opens * (SUPPORTED_LOCALES.length + 1));
  });

  it('has the same route count in every locale', () => {
    const counts = SUPPORTED_LOCALES.map(
      ({ code }) => (localeSitemapXml(code).match(/<url>/g) || []).length,
    );
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeGreaterThan(200);
  });
});
