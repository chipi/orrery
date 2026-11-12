import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import {
  SATELLITE_STATS,
  anonColorLabel,
  contextLabel,
  deepSkyCategoryLabel,
  deepSkyConstellation,
  deepSkyDistance,
  deepSkyTitle,
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

describe('deep-sky formatters', () => {
  const records = JSON.parse(
    readFileSync('static/data/universe/deep-sky-objects.json', 'utf8'),
  ) as { objects: { id: string; designation: string; name: string; dist_ly: number | null }[] };

  it('deepSkyTitle: designation, then the common name; a bare catalogue code is spaced, not repeated', () => {
    expect(deepSkyTitle({ designation: 'M13', name: 'Hercules Globular Cluster' })).toBe(
      'M13 · Hercules Globular Cluster',
    );
    expect(deepSkyTitle({ designation: 'M3', name: 'NGC5272' })).toBe('M3 · NGC 5272');
    expect(deepSkyTitle({ designation: 'M32', name: 'NGC0221' })).toBe('M32 · NGC 221');
    expect(deepSkyTitle({ designation: 'M25', name: 'IC4725' })).toBe('M25 · IC 4725');
    expect(deepSkyTitle({ designation: 'NGC 1365', name: 'NGC1365' })).toBe('NGC 1365');
    expect(deepSkyTitle({ designation: 'NGC 2014 / 2020', name: 'NGC2014' })).toBe(
      'NGC 2014 / 2020',
    );
    expect(deepSkyTitle({ designation: '30 Doradus', name: '30 Dor Cluster' })).toBe(
      '30 Doradus · 30 Dor Cluster',
    );
  });

  it('deepSkyTitle names each of the 141 objects differently, and never shows an unspaced code', () => {
    const titles = records.objects.map((o) => deepSkyTitle(o));
    expect(new Set(titles).size).toBe(141);
    for (const t of titles) expect(t).not.toMatch(/(NGC|IC)\d/);
  });

  it('deepSkyDistance rounds like the data label (two figures from 10,000 ly, three below) in the locale’s number format', () => {
    expect(deepSkyDistance(24201, 'en-US')).toBe(m.unit_ly_value({ value: '~24,000' }));
    expect(deepSkyDistance(1349.7, 'en-US')).toBe(m.unit_ly_value({ value: '~1,350' }));
    expect(deepSkyDistance(54_982_676, 'en-US')).toBe(m.unit_ly_value({ value: '~55 million' }));
    expect(deepSkyDistance(2_687_529, 'en-US')).toBe(m.unit_ly_value({ value: '~2.7 million' }));
    expect(deepSkyDistance(24201, 'de')).toBe(m.unit_ly_value({ value: '~24.000' }));
  });

  it('deepSkyDistance agrees with the English dist_label the data carries, for every object whose distance is a catalogue value', () => {
    // barnard-33 has no catalogue distance: its label is the gallery's hand-written ~1,375.
    for (const o of records.objects.filter((x) => x.dist_ly !== null && x.id !== 'barnard-33')) {
      const label = (o as unknown as { dist_label: string }).dist_label;
      const n = deepSkyDistance(o.dist_ly!, 'en-US').replace(/ ly$/, '');
      expect(label, o.id).toBe(`${n} light-years`);
    }
  });

  it('deepSkyConstellation spells the IAU code', () => {
    expect(deepSkyConstellation('Her')).toBe('Hercules');
    expect(deepSkyConstellation('CVn')).toBe('Canes Venatici');
  });

  it('deepSkyCategoryLabel names every category', () => {
    const cats = [
      'galaxy',
      'galaxy-cluster',
      'nebula',
      'planetary-nebula',
      'supernova-remnant',
      'star-forming-region',
      'dark-nebula',
      'star-cluster',
      'globular-cluster',
      'star',
      'other',
    ] as const;
    expect(new Set(cats.map(deepSkyCategoryLabel)).size).toBe(cats.length);
  });
});
