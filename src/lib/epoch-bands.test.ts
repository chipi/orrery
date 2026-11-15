import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS, epochForYear } from './epoch-bands';

describe('epochForYear (the era strip of /missions buckets a mission by its year)', () => {
  it.each([
    [1957, 'first-steps'],
    [1961, 'first-steps'],
    [1962, 'space-race'],
    [1969, 'space-race'],
    [1970, 'lunar-era'],
    [1972, 'lunar-era'],
    [1973, 'first-stations'],
    [1986, 'first-stations'],
    [1987, 'shuttle-and-mir'],
    [1998, 'shuttle-and-mir'],
    [1999, 'iss-assembly'],
    [2011, 'iss-assembly'],
    [2012, 'commercial-era'],
    [2024, 'commercial-era'],
    [2025, 'lunar-return'],
    [2030, 'lunar-return'],
    [2031, 'mars-era'],
    [2045, 'mars-era'],
  ])('%i is %s', (year, id) => {
    expect(epochForYear(year)).toBe(id);
  });

  it('puts nothing before the first epoch', () => {
    expect(epochForYear(1956)).toBeNull();
  });

  it('keeps the nine epochs in order', () => {
    expect(EPOCH_BANDS.map((b) => b.id)).toEqual([
      'first-steps',
      'space-race',
      'lunar-era',
      'first-stations',
      'shuttle-and-mir',
      'iss-assembly',
      'commercial-era',
      'lunar-return',
      'mars-era',
    ]);
  });

  it('assigns every mission of the index to one epoch, and the counts add up', () => {
    const missions = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
      year: number;
    }[];
    const counts = new Map<string, number>();
    for (const m of missions) {
      const id = epochForYear(m.year);
      expect(id, String(m.year)).not.toBeNull();
      counts.set(id!, (counts.get(id!) ?? 0) + 1);
    }
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(missions.length);
  });
});
