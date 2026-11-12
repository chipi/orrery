import { describe, expect, it } from 'vitest';
import { applyDistanceOverride, DISTANCE_OVERRIDES } from './deep-sky-distance-overrides.mjs';

const cat = (value: number) => ({
  dist_ly: { value, source: 's', bibcode: null, record_url: 'https://x', note: 'n' },
});

describe('applyDistanceOverride', () => {
  it('replaces value and source, converting parsecs to light-years', () => {
    const out = applyDistanceOverride('NGC 6302', cat(2433)).dist_ly;
    expect(out.value).toBe(Math.round(1170 * 3.26156));
    expect(out.source).toMatch(/Meaburn/);
  });
  it('puts both SMC clusters at the Graczyk 2020 distance of 62.44 kpc', () => {
    for (const d of ['NGC 346', 'NGC 602']) {
      const out = applyDistanceOverride(d, cat(208740)).dist_ly;
      expect(out.value).toBe(Math.round(62440 * 3.26156));
      expect(out.source).toMatch(/Graczyk/);
    }
  });
  it('a note-only override keeps the value', () => {
    const out = applyDistanceOverride('NGC 2392', cat(5983)).dist_ly;
    expect(out.value).toBe(5983);
    expect(out.note).toMatch(/4,100 to 6,800/);
  });
  it('leaves other designations and objects without a distance alone', () => {
    const c = cat(1);
    expect(applyDistanceOverride('M1', c)).toBe(c);
    const none = {};
    expect(applyDistanceOverride('NGC 6302', none)).toBe(none);
  });
  it('never carries an unconfirmed bibcode: each is null or 19 characters', () => {
    for (const ov of Object.values(DISTANCE_OVERRIDES) as { bibcode?: string | null }[]) {
      if (ov.bibcode) expect(ov.bibcode).toHaveLength(19);
    }
  });
});
