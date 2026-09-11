import { describe, it, expect } from 'vitest';
import { GET } from './+server';
import { SITE_ORIGIN } from '$lib/seo';

describe('sitemap.xml hreflang annotations (#519)', () => {
  it('emits a valid multilingual sitemap with reciprocal hreflang alternates', async () => {
    const res = GET();
    const xml = await res.text();

    // xhtml namespace declared so the alternates parse.
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    // The home URL is present as a <loc>.
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/</loc>`);
    // Every <url> carries xhtml:link alternates, incl. x-default → en-US home.
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="de"');
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/"/>`,
    );
    // A localized landing is its own <loc> AND carries the full alternate set.
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/ru/</loc>`);

    // Well-formed: one <urlset>, balanced <url> blocks.
    const opens = (xml.match(/<url>/g) || []).length;
    const closes = (xml.match(/<\/url>/g) || []).length;
    expect(opens).toBe(closes);
    expect(opens).toBeGreaterThan(14); // many routes × 14 locales
  });
});
