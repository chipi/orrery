/**
 * Locale resolution for Orrery's i18n layer.
 *
 * Single source of truth for "which locale is active right now" —
 * read from the URL `?lang=` parameter (per ADR-031 + ADR-017),
 * never from `localStorage` (CLAUDE.md ban).
 *
 * Per ADR-031, eleven locales are supported in three waves; only
 * the locales actively shipped in v0.3.x appear in
 * `SUPPORTED_LOCALES`. Future per-language tickets extend this set
 * as their content lands.
 */
import { browser } from '$app/environment';
import type { Page } from '@sveltejs/kit';

/** Locale code as used by Paraglide-js + the data-overlay path. */
export type LocaleCode = 'en-US' | 'es';

export interface LocaleEntry {
  code: LocaleCode;
  /** Native-name label for the locale picker (per PRD-007). */
  nativeName: string;
  /** Short tag for the picker chip (`EN`, `ES`). */
  shortTag: string;
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
  { code: 'en-US', nativeName: 'English', shortTag: 'EN' },
  { code: 'es', nativeName: 'Español', shortTag: 'ES' },
] as const;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

const SUPPORTED_CODES = new Set<string>(SUPPORTED_LOCALES.map((l) => l.code));

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
 * Resolve the active locale for a request. URL `?lang=` wins; if
 * absent, fall back to `navigatorLanguage` (the caller passes
 * `navigator.language` from the browser); final fallback is
 * `DEFAULT_LOCALE` per ADR-017.
 *
 * Pure: no side effects, no URL mutation. The first-visit URL
 * rewrite happens in the caller (LocalePicker / +layout).
 */
export function resolveLocale(
  url: URL | { searchParams: URLSearchParams },
  navigatorLanguage?: string,
): LocaleCode {
  const fromUrl = url.searchParams.get('lang');
  if (isSupportedLocale(fromUrl)) return fromUrl;
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
 */
export function localeFromPage(page: Page): LocaleCode {
  if (!browser) return DEFAULT_LOCALE;
  return resolveLocale(page.url, navigator.language);
}
