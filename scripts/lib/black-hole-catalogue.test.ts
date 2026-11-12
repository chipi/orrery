import { describe, it, expect } from 'vitest';
import {
  PAPERS,
  REAL_HOLES,
  SCHWARZSCHILD_KM_PER_SOLAR_MASS,
  buildRealHole,
  holeDistanceLy,
  withinSimbadRange,
} from './black-hole-catalogue.mjs';

const base = {
  id: 'sagittarius-a-star',
  name: 'Sagittarius A*',
  kind: 'supermassive',
  mass_solar: 4300000,
  dist_ly: 27000,
  spin: 0.9,
  rs_km: 12700000,
};

describe('black-hole catalogue', () => {
  it('converts the paper distances to light-years', () => {
    expect(holeDistanceLy(REAL_HOLES['sagittarius-a-star'].dist)).toBe(26996);
    expect(holeDistanceLy(REAL_HOLES['m87-star'].dist) / 1e6).toBeCloseTo(54.8, 1);
    expect(holeDistanceLy(REAL_HOLES['cygnus-x-1'].dist)).toBe(7241);
  });

  it('replaces mass and distance, recomputes rs from the mass, keeps the render parameters', () => {
    const h = buildRealHole(base, REAL_HOLES['sagittarius-a-star'], { dist_ly: 'extra' });
    expect(h.mass_solar).toBe(4297000);
    expect(h.rs_km).toBe(Math.round(4297000 * SCHWARZSCHILD_KM_PER_SOLAR_MASS));
    expect(h.spin).toBe(0.9);
    expect(h.catalogue.mass_solar.value).toBe(h.mass_solar);
    expect(h.catalogue.dist_ly.value).toBe(h.dist_ly);
    expect(h.catalogue.mass_solar.bibcode).toBe(PAPERS.gravity2022.bibcode);
    expect(h.catalogue.dist_ly.note).toMatch(/Galactic Centre; extra$/);
    expect(h.catalogue.mass_solar.record_url).toBe(
      'https://ui.adsabs.harvard.edu/abs/2022A%26A...657L..12G/abstract',
    );
    expect(h.records.simbad).toContain('Sgr%20A*');
  });

  it('puts every real hole on a paper with a bibcode', () => {
    for (const spec of Object.values(REAL_HOLES)) {
      expect(PAPERS[spec.mass.paper as keyof typeof PAPERS].bibcode).toMatch(/^\d{4}/);
      expect(PAPERS[spec.dist.paper as keyof typeof PAPERS].bibcode).toMatch(/^\d{4}/);
    }
  });

  it('cross-checks a distance against the spread of SIMBAD, with slack, or says it cannot', () => {
    expect(withinSimbadRange(7241, [6800, 7700])).toBe(true);
    expect(withinSimbadRange(30000, [6800, 7700])).toBe(false);
    expect(withinSimbadRange(7241, null)).toBeNull();
  });
});
