import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import {
  SATELLITE_STATS,
  anonColorLabel,
  contextLabel,
  dilationPct,
  fmtScale,
  lightUnitLabel,
} from './format';

describe('explore formatters', () => {
  it('fmtScale keeps mid-range values literal and groups the extremes', () => {
    expect(fmtScale(42)).toBe('42');
    expect(fmtScale(0.5)).toBe('0.5');
    expect(fmtScale(0.001)).toBe(
      (0.001).toLocaleString(undefined, { maximumSignificantDigits: 3 }),
    );
    expect(fmtScale(123456)).toBe(
      (123456).toLocaleString(undefined, { maximumSignificantDigits: 3 }),
    );
  });

  it('lightUnitLabel names each unit, light-years by default', () => {
    const labels = ['light-seconds', 'light-minutes', 'light-hours', 'light-days'].map(
      lightUnitLabel,
    );
    expect(new Set(labels).size).toBe(4);
    expect(lightUnitLabel('light-years')).toBe(lightUnitLabel('anything-else'));
    expect(labels).not.toContain(lightUnitLabel('light-years'));
  });

  it('contextLabel names each shell, the body host name in a body scene', () => {
    expect(contextLabel('body-scene', 'Kepler-186')).toBe('Kepler-186');
    const named = (['neighborhood', 'milky-way', 'local-group', 'solar-system'] as const).map((c) =>
      contextLabel(c, 'x'),
    );
    expect(new Set(named).size).toBe(4);
    expect(contextLabel('virgo', 'x')).toBe(contextLabel('solar-system', 'x'));
  });

  it('dilationPct is the far-clock rate √(1 − 1/k)', () => {
    expect(dilationPct(1.5)).toBe('58%');
    expect(dilationPct(3)).toBe('82%');
    expect(dilationPct(10)).toBe('95%');
  });

  it('anonColorLabel localizes known colours and passes unknown ones through', () => {
    expect(anonColorLabel('red')).toBe(m.star_color_red());
    expect(anonColorLabel('blue-white')).toBe(m.star_color_blue_white());
    expect(anonColorLabel('mauve')).toBe('mauve');
  });

  // Ratios are stored rounded (Enceladus 0.04 = 504/12742 to two places).
  it('SATELLITE_STATS ratios match diameter / Earth (12 742 km) as rounded', () => {
    for (const [id, s] of Object.entries(SATELLITE_STATS)) {
      expect(Math.abs(s.diameterRatioEarth - s.diameterKm / 12742), id).toBeLessThan(0.0005);
    }
  });
});
