/**
 * Locale-aware number / unit formatting.
 *
 * Thin wrappers around `Intl.NumberFormat` so HUD values render with
 * the correct grouping + decimal conventions per locale (e.g.
 * `1,234.5` in en-US vs `1.234,5` in es). Replaces ad-hoc
 * `n.toLocaleString('en-US', ...)` and template-literal `n.toFixed(1)`
 * call sites.
 *
 * Locale strings here use the BCP-47 form Paraglide expects (`en-US`,
 * `es`, ...). The active locale comes from `src/lib/locale.ts`
 * `localeFromPage()` — pass the resolved locale to each helper rather
 * than reading global state, so SSR + tests stay deterministic.
 */
import type { LocaleCode } from './locale';

/**
 * Format a number with locale-correct grouping + decimal separators.
 * Pass `decimals` to control max fraction digits (default 0).
 */
export function formatNumber(value: number, locale: LocaleCode, decimals = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Distance in kilometres, no decimals (matches HUD convention). */
export function formatKm(value: number, locale: LocaleCode): string {
  return `${formatNumber(value, locale)} km`;
}

/** Distance in millions of kilometres (e.g. `144 M km`). */
export function formatMegaKm(valueMkm: number, locale: LocaleCode): string {
  return `${formatNumber(valueMkm, locale)} M km`;
}

/** Velocity in km/s with one decimal (e.g. `29.78 km/s`). */
export function formatKmPerSec(value: number, locale: LocaleCode): string {
  return `${formatNumber(value, locale, 2)} km/s`;
}

/** Mission elapsed time in days (`DAY 254`). Caller supplies the prefix label. */
export function formatDay(value: number, locale: LocaleCode): string {
  return formatNumber(Math.round(value), locale);
}

/**
 * One-way light-time in light-minutes, two decimals (e.g.
 * `0.45 l-min`). Matches the existing FROM EARTH / FROM MARS HUD
 * format.
 */
export function formatLightMinutes(value: number, locale: LocaleCode): string {
  return `${formatNumber(value, locale, 2)} l-min`;
}

/**
 * ∆v in km/s with two decimals + symbol-prefixed
 * (e.g. `Δv 3.61 km/s`). Caller chooses whether to prepend the symbol.
 */
export function formatDeltaV(value: number, locale: LocaleCode): string {
  return formatKmPerSec(value, locale);
}
