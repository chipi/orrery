/**
 * Locale UI metadata + RTL detection for Orrery.
 *
 * Per ADR-031, locales are grouped in waves by script risk. The
 * canonical list lives here; `project.inlang/settings.json#locales`
 * mirrors it for the Paraglide compiler.
 *
 * Runtime locale resolution (URL parsing, cookie reads, navigator
 * fallback, canonicalisation) is owned by `$lib/paraglide/runtime`
 * since the #328 migration to Paraglide 2.x's URL-segment strategy.
 * This module is now thin: locale metadata for the picker, RTL set,
 * and the document-attribute sync helper.
 */
import { browser } from '$app/environment';
import { getLocale, locales } from '$lib/paraglide/runtime';

/**
 * Locale code as used by Paraglide-js + the data-overlay path.
 * The union is mirrored in `project.inlang/settings.json#locales`.
 */
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
 * with `project.inlang/settings.json#locales` and
 * `static/data/i18n/<code>/`. Adding a locale here without populating
 * its message bundle / overlays silently falls back to en-US per
 * ADR-017.
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

/** True when locale should render with right-to-left document flow. */
export function isRtlLocale(locale: LocaleCode): boolean {
  return RTL_LOCALES.has(locale);
}

/**
 * Active locale as resolved by Paraglide's URL strategy. Reads the
 * locale prefix from `window.location` on the client; on the server
 * (prerender) reads from request-bound async-local-storage which
 * the `paraglideMiddleware` in hooks.server.ts populates.
 *
 * Centralises the narrow `LocaleCode` type assertion at one boundary
 * so callers don't sprinkle `as LocaleCode` casts.
 */
export function activeLocale(): LocaleCode {
  return getLocale() as LocaleCode;
}

/**
 * Reactive form of `activeLocale()` for use inside Svelte 5 `$derived`.
 * Paraglide's `getLocale()` reads from non-reactive sources (URL,
 * cookie, request scope), so a bare `$derived(activeLocale())` won't
 * re-fire when the user navigates between `/de/iss` and `/fr/iss`.
 * This helper takes the SvelteKit `Page` store value as a tracking
 * dependency: $derived re-runs whenever the URL changes, and
 * Paraglide's runtime sees the new locale prefix.
 *
 * Callers:
 *   const loc = $derived(localeFromPage($page));
 */
export function localeFromPage(page: { url: URL }): LocaleCode {
  void page.url.pathname;
  return activeLocale();
}

/**
 * Mirrors language + direction on <html> for runtime locale changes.
 * Paraglide's server-side `transformPageChunk` sets the initial value
 * on the prerendered HTML; this helper covers client-side picker
 * switches where the document needs to update without a full reload.
 */
export function syncDocumentLocaleAttributes(locale: LocaleCode): void {
  if (!browser) return;
  const root = document.documentElement;
  root.setAttribute('lang', locale);
  root.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');
}

/**
 * Sanity check that SUPPORTED_LOCALES and Paraglide's compiled
 * `locales` constant agree. Catches the case where a new locale
 * lands in `project.inlang/settings.json` but its picker metadata
 * was forgotten here (would render as a missing chip in LocalePicker).
 */
export function assertLocalesInSync(): void {
  const declared = new Set<string>(locales);
  for (const code of declared) {
    if (!SUPPORTED_CODES.has(code)) {
      throw new Error(
        `Paraglide declares locale "${code}" but src/lib/locale.ts SUPPORTED_LOCALES is missing it. Add an entry.`,
      );
    }
  }
  for (const code of SUPPORTED_CODES) {
    if (!declared.has(code)) {
      throw new Error(
        `src/lib/locale.ts SUPPORTED_LOCALES declares "${code}" but Paraglide's locales constant does not. Run npm run i18n:compile.`,
      );
    }
  }
}
