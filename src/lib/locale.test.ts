// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

// Mock $app/environment so the `browser` flag is true in tests — the
// document-attribute helper short-circuits on `!browser` otherwise,
// even when jsdom provides `document`.
vi.mock('$app/environment', () => ({ browser: true }));

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  isRtlLocale,
  syncDocumentLocaleAttributes,
  assertLocalesInSync,
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
    expect(codes).toContain('nl');
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
  it('accepts every known code', () => {
    for (const l of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(l.code)).toBe(true);
    }
  });
  it('rejects unknown / empty / null', () => {
    expect(isSupportedLocale('xx')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    // sr-Latn was dropped in J.5 — sr-Cyrl is the canonical Serbian.
    expect(isSupportedLocale('sr-Latn')).toBe(false);
  });
});

describe('isRtlLocale', () => {
  it('returns true only for Arabic', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en-US')).toBe(false);
    expect(isRtlLocale('ru')).toBe(false);
    expect(isRtlLocale('ja')).toBe(false);
  });
});

describe('syncDocumentLocaleAttributes', () => {
  it('sets <html lang=...> for the requested locale', () => {
    syncDocumentLocaleAttributes('fr');
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
  });

  it('sets dir="rtl" for the Arabic locale', () => {
    syncDocumentLocaleAttributes('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('sets dir="ltr" for every non-RTL locale', () => {
    syncDocumentLocaleAttributes('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    syncDocumentLocaleAttributes('ja');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    syncDocumentLocaleAttributes('en-US');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});

describe('assertLocalesInSync', () => {
  it('does not throw when SUPPORTED_LOCALES and Paraglide locales agree', () => {
    expect(() => assertLocalesInSync()).not.toThrow();
  });
});

// Reference DEFAULT_LOCALE from imports to keep tsc happy if the
// lints prune unused names.
void DEFAULT_LOCALE;
