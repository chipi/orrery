/**
 * Locale resolution for Orrery's i18n layer.
 *
 * Source-of-truth precedence (per ADR-057):
 *   1. URL `?lang=` parameter — wins always (preserves share-link semantics).
 *   2. `orrery_locale` cookie — explicit user override only, written
 *      from LocalePicker.pick() and never from auto-detect.
 *   3. `navigator.language` — browser-default fallback.
 *   4. `DEFAULT_LOCALE` — final fallback.
 *
 * `localStorage` / `sessionStorage` are never used (CLAUDE.md ban).
 * The single cookie exception is narrowly scoped per ADR-057 and
 * forbids creep to other state.
 *
 * Per ADR-031, locales are grouped in waves by script risk.
 * `SUPPORTED_LOCALES` lists locales currently available in the picker.
 */
import { browser } from '$app/environment';
import type { Page } from '@sveltejs/kit';

/** Locale code as used by Paraglide-js + the data-overlay path. */
export type LocaleCode =
  | 'en-US'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt-BR'
  | 'it'
  | 'nl'
  | 'sr-Cyrl'
  | 'zh-CN'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'ar'
  | 'ru';

export interface LocaleEntry {
  code: LocaleCode;
  /** Native-name label for the locale picker (per PRD-007). */
  nativeName: string;
  /** Short tag for the picker chip (`EN`, `ES`). */
  shortTag: string;
  /** Country flag emoji for the picker. Single canonical country
   * per language even though some are spoken in many — keeps the
   * picker readable. */
  flag: string;
}

/**
 * Locales available to the user in the current build. Keep in sync
 * with `project.inlang/settings.json#languageTags` and
 * `static/data/i18n/<code>/`. Adding a locale here without populating
 * its message bundle / overlays will silently fall back to en-US per
 * ADR-017 — visible to the user as English content under a non-EN
 * picker label.
 */
export const SUPPORTED_LOCALES: readonly LocaleEntry[] = [
  { code: 'en-US', nativeName: 'English', shortTag: 'EN', flag: '🇺🇸' },
  { code: 'es', nativeName: 'Español', shortTag: 'ES', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', shortTag: 'FR', flag: '🇫🇷' },
  { code: 'de', nativeName: 'Deutsch', shortTag: 'DE', flag: '🇩🇪' },
  { code: 'pt-BR', nativeName: 'Português', shortTag: 'PT', flag: '🇧🇷' },
  { code: 'it', nativeName: 'Italiano', shortTag: 'IT', flag: '🇮🇹' },
  { code: 'nl', nativeName: 'Nederlands', shortTag: 'NL', flag: '🇳🇱' },
  { code: 'sr-Cyrl', nativeName: 'Српски', shortTag: 'СР', flag: '🇷🇸' },
  { code: 'zh-CN', nativeName: '简体中文', shortTag: 'ZH', flag: '🇨🇳' },
  { code: 'ja', nativeName: '日本語', shortTag: 'JA', flag: '🇯🇵' },
  { code: 'ko', nativeName: '한국어', shortTag: 'KO', flag: '🇰🇷' },
  { code: 'hi', nativeName: 'हिन्दी', shortTag: 'HI', flag: '🇮🇳' },
  { code: 'ar', nativeName: 'العربية', shortTag: 'AR', flag: '🇸🇦' },
  { code: 'ru', nativeName: 'Русский', shortTag: 'RU', flag: '🇷🇺' },
] as const;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

const SUPPORTED_CODES = new Set<string>(SUPPORTED_LOCALES.map((l) => l.code));
const RTL_LOCALES = new Set<LocaleCode>(['ar']);

/** Type guard: is the string a known locale code? */
export function isSupportedLocale(code: string | null | undefined): code is LocaleCode {
  return code != null && SUPPORTED_CODES.has(code);
}

/**
 * Normalise a raw `navigator.language` value (e.g. `"es-ES"`,
 * `"es-419"`, `"pt-PT"`, `"en"`) to a supported locale code, or
 * null if no supported locale matches.
 *
 * Strategy: exact match first; then language-prefix match
 * (`es-MX` → `es`); then null.
 */
export function normaliseBrowserLocale(raw: string | undefined): LocaleCode | null {
  if (!raw) return null;
  if (isSupportedLocale(raw)) return raw;
  const prefix = raw.toLowerCase().split('-')[0];
  for (const entry of SUPPORTED_LOCALES) {
    if (entry.code.toLowerCase().split('-')[0] === prefix) return entry.code;
  }
  return null;
}

/**
 * Resolve the active locale for a request. Precedence:
 *   1. URL `?lang=` (when supported)
 *   2. `cookieLocale` (when supported) — per ADR-057
 *   3. `navigatorLanguage` (normalised)
 *   4. `DEFAULT_LOCALE`
 *
 * Pure: no side effects, no URL mutation, no cookie reads. The
 * caller (LocalePicker / +layout) supplies all inputs. Tests inject
 * specific values directly without mocking `document` or `navigator`.
 */
export function resolveLocale(
  url: URL | { searchParams: URLSearchParams },
  navigatorLanguage?: string,
  cookieLocale?: LocaleCode | null,
): LocaleCode {
  const fromUrl = url.searchParams.get('lang');
  if (isSupportedLocale(fromUrl)) return fromUrl;
  if (cookieLocale && isSupportedLocale(cookieLocale)) return cookieLocale;
  const fromBrowser = normaliseBrowserLocale(navigatorLanguage);
  if (fromBrowser) return fromBrowser;
  return DEFAULT_LOCALE;
}

/**
 * Convenience wrapper for Svelte components that have `$page`.
 *
 * SSR / prerender guard: SvelteKit's adapter-static prerender forbids
 * reading `url.searchParams` during render (it would change per-request
 * and break determinism). On the server we always return
 * `DEFAULT_LOCALE`; once the page hydrates in the browser the
 * `$derived` / `$effect` blocks re-evaluate and pick up the real URL
 * locale. This means the first paint for a `?lang=es` URL is briefly
 * en-US — a known + accepted trade-off for static prerendering.
 *
 * Reads the `orrery_locale` cookie (per ADR-057) so a user who
 * previously chose a non-browser-default locale via LocalePicker
 * gets that pick honoured even on a fresh URL with no `?lang=`.
 */
export function localeFromPage(page: Page): LocaleCode {
  if (!browser) return DEFAULT_LOCALE;
  return resolveLocale(page.url, navigator.language, readLocaleCookie());
}

/**
 * Cookie name for the explicit-user-set locale override (ADR-057).
 * The ONLY cookie this app sets. See `writeLocaleCookie` for write
 * semantics; never written from auto-detection paths.
 */
export const LOCALE_COOKIE_NAME = 'orrery_locale';

/**
 * Read the `orrery_locale` cookie (per ADR-057).
 * Returns null if absent, malformed, or holding a non-supported code.
 *
 * SSR-safe: returns null when `document` is unavailable.
 */
export function readLocaleCookie(): LocaleCode | null {
  if (!browser) return null;
  for (const raw of document.cookie.split(';')) {
    const [name, value] = raw.trim().split('=');
    if (name !== LOCALE_COOKIE_NAME) continue;
    const decoded = decodeURIComponent(value ?? '');
    return isSupportedLocale(decoded) ? decoded : null;
  }
  return null;
}

/**
 * Write the `orrery_locale` cookie (per ADR-057). MUST be called
 * only from explicit user-action paths — currently just
 * `LocalePicker.pick()`. Auto-detection / canonicalisation paths
 * never write this cookie.
 *
 * Cookie attributes: `SameSite=Lax`, `Path=/`, `Max-Age=31536000`
 * (1 year), `Secure` only on HTTPS. No HttpOnly because there is
 * no server — the value must be readable from `document.cookie`.
 *
 * Stores every supported locale including DEFAULT_LOCALE: an
 * explicit "use English" pick should persist even on a German
 * browser, otherwise next-visit re-detects German.
 */
export function writeLocaleCookie(locale: LocaleCode): void {
  if (!browser) return;
  const isHttps = location.protocol === 'https:';
  const secure = isHttps ? '; Secure' : '';
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

/**
 * Delete the `orrery_locale` cookie. Provided for completeness +
 * tests; no production caller as of v0.5.x. A future "reset
 * preferences" UI would use this.
 */
export function clearLocaleCookie(): void {
  if (!browser) return;
  const isHttps = location.protocol === 'https:';
  const secure = isHttps ? '; Secure' : '';
  document.cookie = `${LOCALE_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

/**
 * Build a relative URL string with `?lang=<locale>` set (or removed
 * if the locale is `DEFAULT_LOCALE`). Preserves existing query params,
 * pathname, and hash.
 *
 * Used by the layout effect for first-visit URL canonicalisation
 * (Issue #73 Gap 1) so a German visitor landing on `/explore` with
 * no `?lang=` ends up at `/explore?lang=de` after the first frame.
 * The URL is then bookmarkable and shareable with correct semantics.
 */
export function canonicaliseLocaleInUrl(url: URL, locale: LocaleCode): string {
  const next = new URL(url.toString());
  if (locale === DEFAULT_LOCALE) {
    next.searchParams.delete('lang');
  } else {
    next.searchParams.set('lang', locale);
  }
  return `${next.pathname}${next.search}${next.hash}`;
}

/**
 * True iff the URL is in canonical form for the resolved locale.
 * Used by the layout effect to decide whether canonicalisation would
 * change anything — short-circuits a no-op `goto` and prevents loops.
 *
 * Canonical means EITHER:
 *  - `?lang=` is absent and resolved === DEFAULT_LOCALE (bare URL, default locale), OR
 *  - `?lang=` is present and exactly equals the resolved locale
 *    (explicit user choice; preserved even when the choice is en-US,
 *     so that `?lang=en-US` shared by a non-English-browser sender
 *     still pins English for the recipient).
 *
 * Non-canonical (rewrite-needed) cases:
 *  - `?lang=` absent, resolved !== DEFAULT_LOCALE  (auto-detected non-default
 *    needs to be promoted into the URL).
 *  - `?lang=xx` (invalid) — `resolveLocale` ignored it, so the param
 *    differs from the resolved locale → strip + replace with the
 *    resolved value (or just strip if resolved is default and
 *    we want to keep the URL minimal — `canonicaliseLocaleInUrl`
 *    handles the strip).
 */
export function isLocaleUrlCanonical(url: URL, locale: LocaleCode): boolean {
  const langParam = url.searchParams.get('lang');
  if (langParam === locale) return true;
  return langParam === null && locale === DEFAULT_LOCALE;
}

/** True when locale should render with right-to-left document flow. */
export function isRtlLocale(locale: LocaleCode): boolean {
  return RTL_LOCALES.has(locale);
}

/**
 * Mirrors language + direction on <html> for runtime locale changes.
 * Keeps `?lang=` as source-of-truth while allowing CSS logical mirroring.
 */
export function syncDocumentLocaleAttributes(locale: LocaleCode): void {
  if (!browser) return;
  const root = document.documentElement;
  root.setAttribute('lang', locale);
  root.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');
}
