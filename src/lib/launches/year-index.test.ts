import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS } from '../epoch-bands';
import {
  buildYearIndex,
  countsByEra,
  decadesOfEra,
  eraReachesUpcoming,
  providersByEra,
} from './year-index';

const DECADES = [
  '1957-1969',
  '1970-1979',
  '1980-1989',
  '1990-1999',
  '2000-2009',
  '2010-2019',
  '2020-2026',
] as const;

describe('buildYearIndex', () => {
  const idx = buildYearIndex([
    { net: '1961-04-12T06:07:00Z', agency_name: 'RVSN' },
    { net: '1961-08-06T06:00:00Z', agency_name: 'RVSN' },
    { net: '1961-02-12T00:00:00Z', agency_name: 'NASA' },
    { net: '1972-12-07T05:33:00Z', agency_name: 'NASA' },
  ]);

  it('counts launches per year and per provider, most launches first', () => {
    expect(idx.years['1961'].n).toBe(3);
    expect(Object.entries(idx.years['1961'].agencies)).toEqual([
      ['RVSN', 2],
      ['NASA', 1],
    ]);
    expect(Object.keys(idx.years)).toEqual(['1961', '1972']);
  });

  it('buckets years into eras by the rule /missions uses (the boundary year is the earlier era)', () => {
    const counts = countsByEra(idx);
    expect(counts.get('first-steps')).toBe(3); // 1961 closes First Steps
    expect(counts.get('lunar-era')).toBe(1); // 1972 closes Lunar Era
    expect(providersByEra(idx).get('first-steps')?.get('RVSN')).toBe(2);
  });
});

describe('decadesOfEra', () => {
  it('lists the decades whose years meet the era, in order', () => {
    expect(decadesOfEra('first-steps', DECADES)).toEqual(['1957-1969']);
    expect(decadesOfEra('lunar-era', DECADES)).toEqual(['1957-1969', '1970-1979']);
    expect(decadesOfEra('shuttle-and-mir', DECADES)).toEqual(['1980-1989', '1990-1999']);
    expect(decadesOfEra('commercial-era', DECADES)).toEqual(['2010-2019', '2020-2026']);
    expect(decadesOfEra('lunar-return', DECADES)).toEqual(['2020-2026']);
    expect(decadesOfEra('mars-era', DECADES)).toEqual([]);
  });
});

describe('eraReachesUpcoming', () => {
  it('is true for the eras that run into the present year and after', () => {
    const reaching = EPOCH_BANDS.filter((b) => eraReachesUpcoming(b.id, 2026)).map((b) => b.id);
    expect(reaching).toEqual(['lunar-return', 'mars-era']);
  });
});

describe('static/data/launches-years.json', () => {
  const root = join(process.cwd(), 'static/data');
  const read = (p: string) =>
    Object.values(
      (
        JSON.parse(readFileSync(p, 'utf8')) as {
          entries: Record<string, { net: string; agency_name: string }>;
        }
      ).entries,
    );

  it('matches the manifests it summarises (regenerate: npx tsx scripts/launches-year-index.ts)', () => {
    const entries = [
      ...read(join(root, 'launches.json')),
      ...readdirSync(join(root, 'launches-historic'))
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => read(join(root, 'launches-historic', f))),
    ];
    const onDisk = JSON.parse(readFileSync(join(root, 'launches-years.json'), 'utf8'));
    expect(onDisk).toEqual(buildYearIndex(entries));
  });
});
