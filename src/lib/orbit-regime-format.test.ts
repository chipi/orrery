/**
 * The orbit ruler and the regime panel share one formatter. Reference: the ruler's old inline
 * formatter, kept here verbatim as the oracle — every locale x regime string must equal it, except
 * that a whole number below 10 no longer prints a ".0" (GIANTS read "5.0–30 AU").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as m from '$lib/paraglide/messages';
import { formatNumber } from '$lib/format';
import type { LocaleCode } from '$lib/locale';
import type { OrbitRegime } from '$types/orbit-regime';
import { fmtRegimeBand } from './orbit-regime-format';

const LOCALES: LocaleCode[] = [
  'en-US',
  'es',
  'fr',
  'de',
  'pt-BR',
  'it',
  'nl',
  'sr-Cyrl',
  'zh-CN',
  'ja',
  'ko',
  'hi',
  'ar',
  'ru',
];
const BASES = [
  'orbit-regimes',
  'orbit-regimes-moon',
  'orbit-regimes-mars',
  'orbit-regimes-explore',
].flatMap((b) => JSON.parse(readFileSync(`static/data/${b}.json`, 'utf8')) as OrbitRegime[]);

type Band = number | [number, number];
function oldBand(r: OrbitRegime, loc: LocaleCode): string {
  const MYRIAD = new Set(['zh-CN', 'ja', 'ko', 'hi']);
  const num = (x: number, decimals = 0) =>
    x >= 100_000 && MYRIAD.has(loc)
      ? new Intl.NumberFormat(loc, { notation: 'compact', maximumSignificantDigits: 3 }).format(x)
      : formatNumber(x, loc, decimals);
  const km = (alt: Band) =>
    typeof alt === 'number'
      ? m.mp_flight_unit_km(
          { value: num(alt >= 1000 ? Math.round(alt / 1000) * 1000 : alt) },
          { locale: loc },
        )
      : m.mp_flight_unit_km({ value: `${num(alt[0])}–${num(alt[1])}` }, { locale: loc });
  const au = (d: Band) => {
    const fmt = (x: number) => num(x, x < 10 ? 1 : 0);
    return typeof d === 'number'
      ? m.unit_au_value({ value: fmt(d) }, { locale: loc })
      : m.unit_au_value({ value: `${fmt(d[0])}–${fmt(d[1])}` }, { locale: loc });
  };
  if (r.altitude_km != null) return km(r.altitude_km);
  if (r.distance_au != null) return au(r.distance_au);
  return '';
}

describe('fmtRegimeBand', () => {
  it('covers 24 regimes', () => {
    expect(BASES).toHaveLength(24);
  });

  it.each(LOCALES)('%s equals the old ruler string for every regime (bar a trailing .0)', (loc) => {
    for (const r of BASES) {
      const want = oldBand(r, loc).replace(/(\d)[.,٫]0(?!\d)/g, '$1');
      expect(fmtRegimeBand(r, loc), `${loc} ${r.id}`).toBe(want.replace(/(\d)[.,٫]0(?!\d)/g, '$1'));
    }
  });

  it('the panel prints a single altitude exactly; the ruler row rounds it to the thousand', () => {
    const geo = BASES.find((r) => r.id === 'GEO')!;
    expect(fmtRegimeBand(geo, 'en-US', { round: false })).toBe('35,786 km');
    expect(fmtRegimeBand(geo, 'en-US')).toBe('36,000 km');
    expect(fmtRegimeBand(geo, 'de', { round: false })).toMatch(/35\.786/);
  });

  it('prints GIANTS as 5–30 AU, not 5.0–30 AU', () => {
    const giants = BASES.find((r) => r.id === 'GIANTS')!;
    expect(fmtRegimeBand(giants, 'en-US')).toBe('5–30 AU');
  });

  it('writes large numbers in 万 / लाख for zh and hi, digit groups for en', () => {
    const l2 = BASES.find((r) => r.id === 'L2' && Array.isArray(r.altitude_km) === false)!;
    expect(fmtRegimeBand(l2, 'en-US')).toMatch(/\d,\d{3},\d{3} km|\d{3},\d{3} km/);
    expect(fmtRegimeBand(l2, 'zh-CN')).toMatch(/万/);
    expect(fmtRegimeBand(l2, 'hi')).toMatch(/लाख/);
  });
});
