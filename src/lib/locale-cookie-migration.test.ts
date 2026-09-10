// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

import {
  migrateLegacyLocaleCookie,
  LEGACY_LOCALE_COOKIE,
  LOCALE_COOKIE,
} from './locale-cookie-migration';

function clearCookies(): void {
  for (const raw of document.cookie.split(';')) {
    const name = raw.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}
function read(name: string): string | null {
  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    if (raw.slice(0, eq).trim() === name) return decodeURIComponent(raw.slice(eq + 1).trim());
  }
  return null;
}

beforeEach(clearCookies);
afterEach(clearCookies);

// The rename (ADR-057 amendment) would otherwise drop the language choice of
// every visitor who ever made one, because the new cookie name is simply absent.
describe('PARAGLIDE_LOCALE → orrery_locale migration', () => {
  it('carries a legacy pick across and clears the stale cookie', () => {
    document.cookie = `${LEGACY_LOCALE_COOKIE}=de; Path=/`;

    expect(migrateLegacyLocaleCookie()).toBe('de');

    expect(read(LOCALE_COOKIE)).toBe('de');
    expect(read(LEGACY_LOCALE_COOKIE)).toBeNull();
  });

  it('is a no-op when there is no legacy cookie', () => {
    expect(migrateLegacyLocaleCookie()).toBeNull();
    expect(read(LOCALE_COOKIE)).toBeNull();
  });

  it('is idempotent — a second run does nothing', () => {
    document.cookie = `${LEGACY_LOCALE_COOKIE}=ja; Path=/`;
    expect(migrateLegacyLocaleCookie()).toBe('ja');
    expect(migrateLegacyLocaleCookie()).toBeNull();
    expect(read(LOCALE_COOKIE)).toBe('ja');
  });

  it('never lets an unsupported value reach locale resolution, but still clears it', () => {
    document.cookie = `${LEGACY_LOCALE_COOKIE}=klingon; Path=/`;

    expect(migrateLegacyLocaleCookie()).toBeNull();

    expect(read(LOCALE_COOKIE)).toBeNull();
    expect(read(LEGACY_LOCALE_COOKIE)).toBeNull(); // dead either way
  });

  // The legacy cookie WINS over an existing orrery_locale. This looks wrong
  // until you know that Paraglide's getLocale() persists its auto-resolved
  // locale on first call, during render — so on the first post-rename load
  // orrery_locale is ALREADY set to the browser-detected language, and a
  // "don't clobber" guard meant the migration never fired at all (caught by
  // the e2e run: orrery_locale came back 'en-US' instead of 'de'). Legacy
  // still being present is proof this browser has not migrated yet.
  it('wins over an auto-resolved orrery_locale written by Paraglide', () => {
    document.cookie = `${LEGACY_LOCALE_COOKIE}=de; Path=/`;
    document.cookie = `${LOCALE_COOKIE}=en-US; Path=/`; // Paraglide's auto-detect

    expect(migrateLegacyLocaleCookie()).toBe('de');

    expect(read(LOCALE_COOKIE)).toBe('de');
    expect(read(LEGACY_LOCALE_COOKIE)).toBeNull();
  });

  it('cannot fire twice — the deleted legacy cookie makes the next load a no-op', () => {
    document.cookie = `${LEGACY_LOCALE_COOKIE}=de; Path=/`;
    expect(migrateLegacyLocaleCookie()).toBe('de');

    // A genuine post-migration pick is now safe from being clobbered.
    document.cookie = `${LOCALE_COOKIE}=fr; Path=/`;
    expect(migrateLegacyLocaleCookie()).toBeNull();
    expect(read(LOCALE_COOKIE)).toBe('fr');
  });

  it('handles every supported locale code, including the hyphenated ones', () => {
    for (const code of ['en-US', 'pt-BR', 'sr-Cyrl', 'zh-CN']) {
      clearCookies();
      document.cookie = `${LEGACY_LOCALE_COOKIE}=${code}; Path=/`;
      expect(migrateLegacyLocaleCookie(), code).toBe(code);
      expect(read(LOCALE_COOKIE)).toBe(code);
    }
  });
});
