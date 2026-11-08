import { describe, it, expect } from 'vitest';
import { article, breadcrumbList, website, absoluteUrl, jsonLdScript } from './json-ld';
import { SITE_ORIGIN } from './seo';

describe('breadcrumbList', () => {
  it('numbers the items from 1 in order', () => {
    const b = breadcrumbList([
      { name: 'Science', url: `${SITE_ORIGIN}/science` },
      { name: 'Orbits', url: `${SITE_ORIGIN}/science/orbits` },
    ]);
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement.map((i) => [i.position, i.name])).toEqual([
      [1, 'Science'],
      [2, 'Orbits'],
    ]);
  });
});

describe('article', () => {
  it('carries headline, url, language and the Orrery publisher; omits absent fields', () => {
    const a = article({
      headline: 'Delta-v',
      url: `${SITE_ORIGIN}/de/essays/delta-v`,
      inLanguage: 'de',
    });
    expect(a).toMatchObject({ '@type': 'Article', headline: 'Delta-v', inLanguage: 'de' });
    expect(a.publisher.name).toBe('Orrery');
    expect('description' in a).toBe(false);
    expect('image' in a).toBe(false);
  });
});

describe('website', () => {
  it('returns a WebSite and an Organization', () => {
    expect(website({ url: `${SITE_ORIGIN}/`, inLanguage: 'en-US' }).map((x) => x['@type'])).toEqual(
      ['WebSite', 'Organization'],
    );
  });
});

describe('absoluteUrl', () => {
  it('keeps absolute URLs and prefixes site paths with the prod origin, minus the base', () => {
    expect(absoluteUrl('https://cdn.example/x.webp')).toBe('https://cdn.example/x.webp');
    expect(absoluteUrl('/images/a.webp')).toBe(`${SITE_ORIGIN}/images/a.webp`);
    expect(absoluteUrl('/orrery/images/a.webp', '/orrery')).toBe(`${SITE_ORIGIN}/images/a.webp`);
  });
});

describe('jsonLdScript', () => {
  it('escapes < so the data cannot close the script element', () => {
    const s = jsonLdScript({ headline: '</script><script>alert(1)</script>' });
    expect(s.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(s.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(s.slice(35, -9).replace(/\\u003c/g, '<')).headline).toBe(
      '</script><script>alert(1)</script>',
    );
  });
});
