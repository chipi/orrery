import { describe, it, expect } from 'vitest';
import {
  SITE_ORIGIN,
  canonicalRoute,
  localizedPath,
  canonicalUrl,
  hreflangAlternates,
} from './seo';
import { SUPPORTED_LOCALES } from './locale';

describe('canonicalRoute', () => {
  it('leaves an un-prefixed en-US route unchanged', () => {
    expect(canonicalRoute('/missions')).toBe('/missions');
    expect(canonicalRoute('/')).toBe('/');
  });

  it('strips a non-default locale prefix', () => {
    expect(canonicalRoute('/de/missions')).toBe('/missions');
    expect(canonicalRoute('/ja/science/physics/kepler')).toBe('/science/physics/kepler');
  });

  it('reduces a localized landing (trailing slash) to root', () => {
    expect(canonicalRoute('/de/')).toBe('/');
    expect(canonicalRoute('/sr-Cyrl/')).toBe('/');
  });

  it('strips the SvelteKit base prefix (GH Pages)', () => {
    expect(canonicalRoute('/orrery/de/missions', '/orrery')).toBe('/missions');
    expect(canonicalRoute('/orrery/missions', '/orrery')).toBe('/missions');
    expect(canonicalRoute('/orrery/de/', '/orrery')).toBe('/');
  });

  it('does not mistake a real route segment for a locale', () => {
    // 'missions' is not a locale — must be preserved.
    expect(canonicalRoute('/missions/launches')).toBe('/missions/launches');
  });
});

describe('localizedPath', () => {
  it('returns the bare route for the default locale', () => {
    expect(localizedPath('/missions', 'en-US')).toBe('/missions');
    expect(localizedPath('/', 'en-US')).toBe('/');
  });

  it('prefixes non-default locales, keeping the root trailing slash', () => {
    expect(localizedPath('/missions', 'de')).toBe('/de/missions');
    expect(localizedPath('/', 'de')).toBe('/de/');
  });
});

describe('canonicalUrl', () => {
  it('builds an absolute prod URL', () => {
    expect(canonicalUrl('/missions', 'en-US')).toBe(`${SITE_ORIGIN}/missions`);
    expect(canonicalUrl('/missions', 'fr')).toBe(`${SITE_ORIGIN}/fr/missions`);
    expect(canonicalUrl('/', 'de')).toBe(`${SITE_ORIGIN}/de/`);
  });
});

describe('hreflangAlternates', () => {
  it('emits one entry per locale plus x-default', () => {
    const alts = hreflangAlternates('/missions');
    expect(alts).toHaveLength(SUPPORTED_LOCALES.length + 1);
    expect(alts.at(-1)).toEqual({
      hreflang: 'x-default',
      href: `${SITE_ORIGIN}/missions`,
    });
    expect(alts.find((a) => a.hreflang === 'de')?.href).toBe(`${SITE_ORIGIN}/de/missions`);
    expect(alts.find((a) => a.hreflang === 'en-US')?.href).toBe(`${SITE_ORIGIN}/missions`);
  });

  it('x-default resolves to the en-US URL for every route', () => {
    const alts = hreflangAlternates('/');
    const xd = alts.find((a) => a.hreflang === 'x-default');
    const en = alts.find((a) => a.hreflang === 'en-US');
    expect(xd?.href).toBe(en?.href);
    expect(xd?.href).toBe(`${SITE_ORIGIN}/`);
  });
});
