import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { overwriteGetLocale } from '$lib/paraglide/runtime';
import { regimeNum } from '$lib/orbit-regime-format';
import {
  SATELLITE_STATS,
  anonColorLabel,
  beltIndexMeta,
  contextLabel,
  deepSkyCategoryLabel,
  deepSkyConstellation,
  deepSkyDistance,
  deepSkyTitle,
  dilationPct,
  distanceUnitLabel,
  distanceWithUnit,
  fmtScale,
  galaxyDiameter,
  galaxyDistance,
  galaxyGroupLabel,
  galaxyKindLabel,
  lightUnitLabel,
  moonIndexMeta,
  planetIndexMeta,
  smallBodyIndexMeta,
  structureDistance,
  structureKindLabel,
  structureSpan,
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

  it("distanceWithUnit puts the value in the locale's own unit form for every unit", () => {
    expect(distanceWithUnit('12', 'AU')).toBe(m.unit_au_value({ value: '12' }));
    expect(distanceWithUnit('12', 'ly')).toBe(m.unit_ly_value({ value: '12' }));
    expect(distanceWithUnit('12', 'pc')).toBe(m.unit_pc_value({ value: '12' }));
    expect(distanceWithUnit('12', 'km')).toBe(m.mp_flight_unit_km({ value: '12' }));
    expect(distanceWithUnit('12', 'm')).toBe(m.unit_m_value({ value: '12' }));
  });

  it('distanceWithUnit takes metres as its own unit, not the fallback', () => {
    expect(distanceWithUnit('800', 'm')).toBe(m.unit_m_value({ value: '800' }));
    expect(distanceWithUnit('800', 'm')).toBe('800 m');
  });

  it("distanceWithUnit writes metres in the reader's script, which the fallback would not", () => {
    try {
      overwriteGetLocale(() => 'ru');
      expect(distanceWithUnit('800', 'm')).toBe('800 м');
      overwriteGetLocale(() => 'ar');
      expect(distanceWithUnit('800', 'm')).toBe('800 م');
    } finally {
      overwriteGetLocale(() => 'en-US');
    }
  });

  it('distanceWithUnit keeps an unknown unit as "value unit"', () => {
    expect(distanceWithUnit('5', 'furlong')).toBe('5 furlong');
  });

  it('distanceUnitLabel is the bare unit with no value', () => {
    expect(distanceUnitLabel('m')).toBe(m.unit_m_value({ value: '' }).trim());
    expect(distanceUnitLabel('AU')).toBe(m.unit_au_value({ value: '' }).trim());
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

  it('deepSkyTitle names each of the 143 objects differently, and never shows an unspaced code', () => {
    const titles = records.objects.map((o) => deepSkyTitle(o));
    expect(new Set(titles).size).toBe(143);
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

describe('galaxy and structure formatters (panel and page share them)', () => {
  it('a galaxy distance has three significant figures, in the locale’s number format and unit', () => {
    expect(galaxyDistance(2.5538, 'en-US')).toBe('2,550,000 ly');
    expect(galaxyDistance(0.1583, 'en-US')).toBe('158,000 ly');
    expect(galaxyDistance(2.5538, 'de')).toBe(`${(2550000).toLocaleString('de')} ly`);
    expect(galaxyDiameter(105, 'en-US')).toBe('105,000 ly');
  });

  it('a structure distance has three significant figures (Mpc × 3.26e6), a span is shown to the light-year', () => {
    expect(structureDistance(16.5, 'en-US')).toBe('53,800,000 ly');
    expect(structureDistance(3.3, 'en-US')).toBe('10,800,000 ly');
    expect(structureSpan(520, 'en-US')).toBe('520,000,000 ly');
    expect(structureDistance(16.5, 'fr')).toBe(
      m.unit_ly_value({ value: (53800000).toLocaleString('fr') }),
    );
  });

  it('every kind of the data has its own label, and an unknown kind keeps its id', () => {
    for (const k of [
      'spiral',
      'irregular',
      'dwarf-elliptical',
      'dwarf-spheroidal',
      'dwarf-irregular',
    ])
      expect(galaxyKindLabel(k), k).not.toBe(k);
    for (const k of [
      'group',
      'cloud',
      'cluster',
      'supercluster',
      'attractor',
      'wall',
      'void',
      'concentration',
    ])
      expect(structureKindLabel(k), k).not.toBe(k);
    expect(galaxyKindLabel('x')).toBe('x');
    expect(structureKindLabel('x')).toBe('x');
  });

  it('a galaxy’s place in the Local Group: ours, a major member, a satellite, or a free dwarf', () => {
    const label = (id: string, parent: string) => galaxyGroupLabel(id, parent);
    expect(label('milky-way', 'milky-way')).toBe(m.explore_lg_group_self());
    expect(label('andromeda', 'andromeda')).toBe(m.explore_lg_group_anchor());
    expect(label('lmc', 'milky-way')).toBe(m.explore_lg_group_mw());
    expect(label('ngc-147', 'andromeda')).toBe(m.explore_lg_group_andromeda());
    expect(label('wlm', 'independent')).toBe(m.explore_lg_group_independent());
  });
});

describe('solar-system INDEX meta (C6)', () => {
  it('a planet: distance, diameter and its listed moons; no moon part for none', () => {
    expect(planetIndexMeta({ au: 1.5237, diameterKm: 6779, moons: 2 }, 'en-US')).toBe(
      '1.52 AU · 6,779 km · 2 major moons',
    );
    expect(planetIndexMeta({ au: 0.387, diameterKm: 4880, moons: 0 }, 'en-US')).toBe(
      '0.387 AU · 4,880 km',
    );
    expect(planetIndexMeta({ au: 30.07, diameterKm: 49244, moons: 1 }, 'en-US')).toBe(
      '30.1 AU · 49,244 km · 1 major moon',
    );
  });

  it('a small body: three significant figures, no trailing .0, none for a missing size', () => {
    expect(smallBodyIndexMeta({ au: 2.766, diameterKm: 939.4 }, 'en-US')).toBe('2.77 AU · 939 km');
    expect(smallBodyIndexMeta({ au: 1.1264, diameterKm: 0.49 }, 'en-US')).toBe('1.13 AU · 0.49 km');
    expect(smallBodyIndexMeta({ au: 17.834 }, 'en-US')).toBe('17.8 AU');
  });

  it('a moon names its planet first; a belt is a range with no trailing .0', () => {
    expect(moonIndexMeta('Jupiter', 3643, 'en-US')).toBe('Jupiter · 3,643 km');
    expect(beltIndexMeta(2.2, 3.2, 'en-US')).toBe('2.2–3.2 AU');
    expect(beltIndexMeta(30, 50, 'en-US')).toBe('30–50 AU');
  });

  it('the unit form and the digits follow the locale (ru а. е., de AE, ar و.ف)', () => {
    expect(smallBodyIndexMeta({ au: 2.766, diameterKm: 939.4 }, 'ru')).toBe('2,77 а. е. · 939 км');
    expect(beltIndexMeta(2.2, 3.2, 'de')).toBe('2,2–3,2 AE');
    expect(moonIndexMeta('المشتري', 3643, 'ar')).toBe('المشتري · 3,643 كم');
    expect(beltIndexMeta(2.2, 3.2, 'ar')).toBe('2.2–3.2 و.ف');
  });

  it('a diameter from 100,000 km is written in 万/만/लाख in zh, ja, ko and hi, like the ruler', () => {
    const jupiter = { au: 5.2, diameterKm: 139820, moons: 0 };
    for (const loc of ['zh-CN', 'ja', 'ko', 'hi'] as const) {
      expect(planetIndexMeta(jupiter, loc)).toContain(regimeNum(139820, loc));
      expect(planetIndexMeta(jupiter, loc)).not.toContain('139');
    }
    expect(planetIndexMeta(jupiter, 'de')).toContain('139.820');
    expect(moonIndexMeta('木星', 3643, 'ja')).toBe('木星 · 3,643 km');
  });
});
