import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  isRtlLocale,
  normaliseBrowserLocale,
  resolveLocale,
  canonicaliseLocaleInUrl,
  isLocaleUrlCanonical,
} from './locale';

describe('SUPPORTED_LOCALES', () => {
  it('includes all configured rollout locales', () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain('en-US');
    expect(codes).toContain('es');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
    expect(codes).toContain('pt-BR');
    expect(codes).toContain('it');
    expect(codes).toContain('sr-Cyrl');
    expect(codes).toContain('zh-CN');
    expect(codes).toContain('ja');
    expect(codes).toContain('ko');
    expect(codes).toContain('hi');
    expect(codes).toContain('ar');
    expect(codes).toContain('ru');
  });

  it('every entry has a non-empty native name and short tag', () => {
    for (const l of SUPPORTED_LOCALES) {
      expect(l.nativeName.length).toBeGreaterThan(0);
      expect(l.shortTag.length).toBeGreaterThan(0);
    }
  });
});

describe('isSupportedLocale', () => {
  it('accepts known codes', () => {
    expect(isSupportedLocale('en-US')).toBe(true);
    expect(isSupportedLocale('es')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('de')).toBe(true);
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('it')).toBe(true);
    // sr-Latn dropped in J.5 — sr-Cyrl is the canonical Serbian.
    expect(isSupportedLocale('sr-Latn')).toBe(false);
    expect(isSupportedLocale('sr-Cyrl')).toBe(true);
    expect(isSupportedLocale('zh-CN')).toBe(true);
    expect(isSupportedLocale('ja')).toBe(true);
    expect(isSupportedLocale('ko')).toBe(true);
    expect(isSupportedLocale('hi')).toBe(true);
    expect(isSupportedLocale('ar')).toBe(true);
    expect(isSupportedLocale('ru')).toBe(true);
  });
  it('rejects unknown / empty / null', () => {
    expect(isSupportedLocale('xx')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe('normaliseBrowserLocale', () => {
  it('exact match returns the code', () => {
    expect(normaliseBrowserLocale('en-US')).toBe('en-US');
    expect(normaliseBrowserLocale('es')).toBe('es');
    expect(normaliseBrowserLocale('pt-BR')).toBe('pt-BR');
    // sr-Latn was dropped — browser-sent sr-Latn falls back to
    // sr-Cyrl via the language-prefix branch ('sr' → 'sr-Cyrl').
    expect(normaliseBrowserLocale('sr-Latn')).toBe('sr-Cyrl');
    expect(normaliseBrowserLocale('sr-Cyrl')).toBe('sr-Cyrl');
  });
  it('language-prefix matches Spanish variants', () => {
    expect(normaliseBrowserLocale('es-ES')).toBe('es');
    expect(normaliseBrowserLocale('es-MX')).toBe('es');
    expect(normaliseBrowserLocale('es-419')).toBe('es');
  });
  it('language-prefix matches English variants', () => {
    expect(normaliseBrowserLocale('en')).toBe('en-US');
    expect(normaliseBrowserLocale('en-GB')).toBe('en-US');
  });
  it('returns null for unsupported language prefixes', () => {
    expect(normaliseBrowserLocale('bn')).toBe(null);
    expect(normaliseBrowserLocale('')).toBe(null);
    expect(normaliseBrowserLocale(undefined)).toBe(null);
  });
});

describe('isRtlLocale', () => {
  it('returns true only for Arabic', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en-US')).toBe(false);
    expect(isRtlLocale('ru')).toBe(false);
  });
});

describe('resolveLocale', () => {
  it('URL ?lang= wins when supported', () => {
    const url = new URL('https://orrery.local/explore?lang=es');
    expect(resolveLocale(url, 'fr-FR')).toBe('es');
  });
  it('URL ?lang= ignored when unsupported; falls back to browser', () => {
    const url = new URL('https://orrery.local/explore?lang=xx');
    expect(resolveLocale(url, 'es-MX')).toBe('es');
  });
  it('browser language used when no URL ?lang=', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'es-ES')).toBe('es');
  });
  it('falls back to DEFAULT_LOCALE when neither URL nor browser supplies a supported locale', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'bn-BD')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(url, undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe('canonicaliseLocaleInUrl', () => {
  it('adds ?lang= for non-default locales when no param present', () => {
    const url = new URL('https://orrery.local/explore');
    expect(canonicaliseLocaleInUrl(url, 'de')).toBe('/explore?lang=de');
  });
  it('updates an incorrect ?lang= to the resolved locale', () => {
    const url = new URL('https://orrery.local/explore?lang=xx');
    expect(canonicaliseLocaleInUrl(url, 'fr')).toBe('/explore?lang=fr');
  });
  it('removes ?lang= when locale is DEFAULT_LOCALE', () => {
    const url = new URL('https://orrery.local/explore?lang=en-US');
    expect(canonicaliseLocaleInUrl(url, 'en-US')).toBe('/explore');
  });
  it('preserves other query params and hash', () => {
    const url = new URL('https://orrery.local/missions?dest=mars&status=active#top');
    const result = canonicaliseLocaleInUrl(url, 'de');
    expect(result).toContain('lang=de');
    expect(result).toContain('dest=mars');
    expect(result).toContain('status=active');
    expect(result).toContain('#top');
  });
  it('preserves the pathname exactly', () => {
    const url = new URL('https://orrery.local/science/orbits/keplers-laws?lang=xx');
    expect(canonicaliseLocaleInUrl(url, 'es')).toBe('/science/orbits/keplers-laws?lang=es');
  });
});

describe('isLocaleUrlCanonical', () => {
  it('returns true when resolved is DEFAULT_LOCALE and no ?lang= present', () => {
    const url = new URL('https://orrery.local/explore');
    expect(isLocaleUrlCanonical(url, 'en-US')).toBe(true);
  });
  it('returns true when ?lang=en-US is explicit (preserves user choice over canonicalisation)', () => {
    // Sharing-link semantics: a German user who explicitly puts ?lang=en-US
    // expects the recipient to get English regardless of *their* browser.
    // Stripping the param would break that, so explicit-default is canonical.
    const url = new URL('https://orrery.local/explore?lang=en-US');
    expect(isLocaleUrlCanonical(url, 'en-US')).toBe(true);
  });
  it('returns true when resolved equals the URL ?lang=', () => {
    const url = new URL('https://orrery.local/explore?lang=de');
    expect(isLocaleUrlCanonical(url, 'de')).toBe(true);
  });
  it('returns false when resolved differs from the URL ?lang=', () => {
    const url = new URL('https://orrery.local/explore?lang=xx');
    expect(isLocaleUrlCanonical(url, 'de')).toBe(false);
  });
  it('returns false when no ?lang= and resolved is non-default', () => {
    const url = new URL('https://orrery.local/explore');
    expect(isLocaleUrlCanonical(url, 'de')).toBe(false);
  });
});
