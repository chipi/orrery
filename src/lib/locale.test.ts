// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock $app/environment so the `browser` flag is true in tests — the
// cookie + document-attribute helpers short-circuit on `!browser`
// otherwise, even when jsdom provides `document`.
vi.mock('$app/environment', () => ({ browser: true }));

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  isRtlLocale,
  normaliseBrowserLocale,
  resolveLocale,
  canonicaliseLocaleInUrl,
  isLocaleUrlCanonical,
  LOCALE_COOKIE_NAME,
  readLocaleCookie,
  writeLocaleCookie,
  clearLocaleCookie,
  syncDocumentLocaleAttributes,
  localeFromPage,
} from './locale';
import type { Page } from '@sveltejs/kit';

// Minimal Page stub for localeFromPage tests — only `url` is read.
function makePage(href: string): Page {
  return { url: new URL(href) } as unknown as Page;
}

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

  // ─── ADR-057: cookie precedence ────────────────────────────────
  it('cookie sits between URL and navigator.language (URL still wins)', () => {
    const url = new URL('https://orrery.local/explore?lang=fr');
    expect(resolveLocale(url, 'de-DE', 'it')).toBe('fr');
  });
  it('cookie used when no URL ?lang= (overrides navigator.language)', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'de-DE', 'it')).toBe('it');
  });
  it('cookie ignored when not a supported locale', () => {
    const url = new URL('https://orrery.local/explore');
    // @ts-expect-error testing runtime guard against malformed cookie
    expect(resolveLocale(url, 'de-DE', 'xx')).toBe('de');
  });
  it('null cookie behaves identically to omitted cookie', () => {
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'de-DE', null)).toBe('de');
    expect(resolveLocale(url, 'de-DE')).toBe('de');
  });
  it('cookie holds en-US explicitly → resolves to en-US even when browser is German', () => {
    // Sharing semantics: a user who explicitly picked English should
    // stay English on fresh URLs regardless of their browser locale.
    const url = new URL('https://orrery.local/explore');
    expect(resolveLocale(url, 'de-DE', 'en-US')).toBe('en-US');
  });
});

describe('LOCALE_COOKIE_NAME', () => {
  it('is the canonical cookie name per ADR-057', () => {
    expect(LOCALE_COOKIE_NAME).toBe('orrery_locale');
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

// ─── G2 gap-closure: cookie + document-attribute helpers (ADR-057) ───
// These touch `document` + `location` — the file-level @vitest-environment
// jsdom directive at the top of the file activates the DOM environment so
// the `browser` short-circuit in locale.ts admits these calls.

describe('locale cookie helpers (ADR-057)', () => {
  beforeEach(() => {
    // Clear any cookies between tests.
    document.cookie = `${LOCALE_COOKIE_NAME}=; Max-Age=0; Path=/`;
  });

  it('readLocaleCookie returns null when no cookie is set', () => {
    expect(readLocaleCookie()).toBeNull();
  });

  it('writeLocaleCookie stores the locale and readLocaleCookie reads it back', () => {
    writeLocaleCookie('fr');
    expect(readLocaleCookie()).toBe('fr');
  });

  it('writeLocaleCookie persists DEFAULT_LOCALE (explicit English pick)', () => {
    writeLocaleCookie('en-US');
    expect(readLocaleCookie()).toBe('en-US');
  });

  it('readLocaleCookie returns null when cookie holds an unsupported code', () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=xx-INVALID; Path=/`;
    expect(readLocaleCookie()).toBeNull();
  });

  it('readLocaleCookie ignores unrelated cookies with similar names', () => {
    document.cookie = `not_orrery_locale=fr; Path=/`;
    document.cookie = `orrery_locale_other=de; Path=/`;
    expect(readLocaleCookie()).toBeNull();
  });

  it('clearLocaleCookie removes a previously written cookie', () => {
    writeLocaleCookie('ja');
    expect(readLocaleCookie()).toBe('ja');
    clearLocaleCookie();
    expect(readLocaleCookie()).toBeNull();
  });

  it('writeLocaleCookie persists sr-Cyrl (locale code with hyphen + script tag)', () => {
    writeLocaleCookie('sr-Cyrl');
    expect(readLocaleCookie()).toBe('sr-Cyrl');
    // Raw document.cookie carries the value (URL-encoded if needed).
    expect(document.cookie).toContain('sr-Cyrl');
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

describe('localeFromPage (G6)', () => {
  beforeEach(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=; Max-Age=0; Path=/`;
  });

  it('uses ?lang= param when present + supported', () => {
    expect(localeFromPage(makePage('https://orrery.local/explore?lang=fr'))).toBe('fr');
  });

  it('falls back to navigator.language when ?lang= is absent', () => {
    Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
    expect(localeFromPage(makePage('https://orrery.local/explore'))).toBe('de');
  });

  it('prefers the orrery_locale cookie over navigator.language when ?lang= is absent', () => {
    Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
    writeLocaleCookie('ja');
    expect(localeFromPage(makePage('https://orrery.local/explore'))).toBe('ja');
  });

  it('falls back to DEFAULT_LOCALE when nothing is set', () => {
    Object.defineProperty(navigator, 'language', { value: 'xx-NONE', configurable: true });
    expect(localeFromPage(makePage('https://orrery.local/explore'))).toBe(DEFAULT_LOCALE);
  });
});

// Reference DEFAULT_LOCALE + SUPPORTED_LOCALES from imports to keep
// tsc happy if the lints prune unused names.
void DEFAULT_LOCALE;
void SUPPORTED_LOCALES;
