import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normaliseBrowserLocale,
  resolveLocale,
} from './locale';

describe('SUPPORTED_LOCALES', () => {
  it('includes en-US and es', () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain('en-US');
    expect(codes).toContain('es');
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
  });
  it('rejects unknown / empty / null', () => {
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});

describe('normaliseBrowserLocale', () => {
  it('exact match returns the code', () => {
    expect(normaliseBrowserLocale('en-US')).toBe('en-US');
    expect(normaliseBrowserLocale('es')).toBe('es');
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
    expect(normaliseBrowserLocale('fr-FR')).toBe(null);
    expect(normaliseBrowserLocale('ja')).toBe(null);
    expect(normaliseBrowserLocale('')).toBe(null);
    expect(normaliseBrowserLocale(undefined)).toBe(null);
  });
});

describe('resolveLocale', () => {
  it('URL ?lang= wins when supported', () => {
    const url = new URL('https://orrery.local/explore?lang=es');
    expect(resolveLocale(url, 'fr-FR')).toBe('es');
  });
  it('URL ?lang= ignored when unsupported; falls back to browser', () => {
    const url = new URL('https://orrery.local/explore?lang=fr');
    expect(resolveLocale(url, 'es-MX')).toBe('es');
  });
  it('browser language used when no URL ?lang=', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'es-ES')).toBe('es');
  });
  it('falls back to DEFAULT_LOCALE when neither URL nor browser supplies a supported locale', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'ja-JP')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(url, undefined)).toBe(DEFAULT_LOCALE);
  });
});
