// One-shot migration: PARAGLIDE_LOCALE → orrery_locale (ADR-057 amendment,
// 2026-09-10).
//
// WHY THIS EXISTS. ADR-057 has always specified the locale cookie as
// `orrery_locale`, and /credits + /privacy disclose it under that name — but
// no `cookieName` override was ever set, so Paraglide wrote its default
// `PARAGLIDE_LOCALE`. The documented cookie did not exist; the real one was
// undisclosed. Setting `cookieName` fixes that going forward, and would
// otherwise silently drop the language choice of every visitor who ever made
// one: the new name is absent, so resolution falls through to
// `preferredLanguage`. They would also keep carrying the old 400-day cookie,
// which nothing reads and which contradicts the "three cookies" disclosure in
// DevTools for up to 13 months.
//
// So on first load we copy the value across (validated — never trust a cookie
// value into locale resolution) and delete the stale one.
//
// REMOVAL: safe to delete after ~2027-10, by which point every 400-day
// PARAGLIDE_LOCALE written before the rename has expired on its own.

import { browser } from '$app/environment';
import { isSupportedLocale } from './locale';

export const LEGACY_LOCALE_COOKIE = 'PARAGLIDE_LOCALE';
export const LOCALE_COOKIE = 'orrery_locale';
/** 365 days — ADR-057. Matches `cookieMaxAge` in the Paraglide options. */
export const LOCALE_COOKIE_MAX_AGE_SEC = 31536000;

function readCookie(name: string): string | null {
  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    if (raw.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(raw.slice(eq + 1).trim());
  }
  return null;
}

/**
 * Copy a legacy `PARAGLIDE_LOCALE` to `orrery_locale` and clear the legacy one.
 * Idempotent, SSR-safe, and a no-op once the legacy cookie is gone.
 *
 * Returns the migrated locale code, or null when nothing was migrated — the
 * return value exists for the test; callers can ignore it.
 */
export function migrateLegacyLocaleCookie(): string | null {
  if (!browser) return null;
  const legacy = readCookie(LEGACY_LOCALE_COOKIE);
  if (!legacy) return null;

  // Delete the stale cookie whatever happens — Paraglide wrote it with
  // `path=/` and no domain, so the deletion must match exactly or the browser
  // keeps it. Done even for an unsupported value: it is dead either way.
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LEGACY_LOCALE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;

  // Never let an arbitrary cookie value reach locale resolution.
  if (!isSupportedLocale(legacy)) return null;

  // The legacy cookie WINS over whatever is currently in `orrery_locale`.
  //
  // It is tempting to bail when the new cookie already exists ("don't clobber a
  // newer pick") — that was the first version of this, and it meant the
  // migration never fired at all. Paraglide's `getLocale()` resolves on first
  // call and immediately persists the result (`runtime.js`: `setLocale(resolved,
  // { reload: false })`), which happens during render, before this runs. So on
  // the first post-rename load `orrery_locale` is ALREADY set — to the
  // auto-detected `preferredLanguage`, not to anything the user chose.
  //
  // The legacy cookie still being present is proof this browser has not been
  // migrated yet, so there cannot be a genuine post-rename pick to clobber: a
  // real pick can only happen after this runs, and this deletes the legacy
  // cookie, so the next load is a no-op.

  document.cookie =
    `${LOCALE_COOKIE}=${encodeURIComponent(legacy)}; ` +
    `Max-Age=${LOCALE_COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax${secure}`;
  return legacy;
}
