/**
 * Altitude / distance text of an orbit regime — one formatter for the orbit ruler rows and the
 * regime panel's stat, so both read the same in every locale (localised unit, locale digit
 * grouping, 万/만/लाख for large numbers in zh/ja/ko/hi).
 */
import * as m from '$lib/paraglide/messages';
import { formatNumber } from '$lib/format';
import type { LocaleCode } from '$lib/locale';
import type { OrbitRegime } from '$types/orbit-regime';

type Band = number | [number, number];

// zh/ja/ko write large numbers in 万/만 and hi in लाख, as the site's own text does
// ("150万公里", "97 लाख किमी"), not in digit groups.
const MYRIAD_LOCALES = new Set<LocaleCode>(['zh-CN', 'ja', 'ko', 'hi']);

export function regimeNum(x: number, locale: LocaleCode, decimals = 0): string {
  if (x >= 100_000 && MYRIAD_LOCALES.has(locale)) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumSignificantDigits: 3,
    }).format(x);
  }
  return formatNumber(x, locale, decimals);
}

/** `round` (the ruler row) gives a single altitude of 1,000 km or more to the nearest thousand; the
 *  regime panel passes `round: false`, so its stat agrees with its text ("exactly 35,786 km"). */
export function fmtRegimeKm(
  alt: Band,
  locale: LocaleCode,
  { round = true }: { round?: boolean } = {},
): string {
  const n = (x: number) => regimeNum(x, locale);
  if (typeof alt === 'number') {
    return m.mp_flight_unit_km(
      { value: n(round && alt >= 1000 ? Math.round(alt / 1000) * 1000 : alt) },
      { locale },
    );
  }
  return m.mp_flight_unit_km({ value: `${n(alt[0])}–${n(alt[1])}` }, { locale });
}

export function fmtRegimeAU(d: Band, locale: LocaleCode): string {
  // 5 AU, not 5.0 AU: a decimal only where the number has one.
  const fmt = (x: number) => regimeNum(x, locale, x < 10 && !Number.isInteger(x) ? 1 : 0);
  if (typeof d === 'number') return m.unit_au_value({ value: fmt(d) }, { locale });
  return m.unit_au_value({ value: `${fmt(d[0])}–${fmt(d[1])}` }, { locale });
}

export function fmtRegimeBand(
  r: OrbitRegime,
  locale: LocaleCode,
  opts: { round?: boolean } = {},
): string {
  if (r.altitude_km != null) return fmtRegimeKm(r.altitude_km, locale, opts);
  if (r.distance_au != null) return fmtRegimeAU(r.distance_au, locale);
  return '';
}
