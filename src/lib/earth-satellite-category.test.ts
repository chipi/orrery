import { describe, it, expect } from 'vitest';
import { categoriseEarthSatellite } from './earth-satellite-category';

describe('categoriseEarthSatellite', () => {
  it('classifies ISS + Tiangong as station', () => {
    expect(categoriseEarthSatellite('iss')).toBe('station');
    expect(categoriseEarthSatellite('tiangong')).toBe('station');
  });

  it('classifies the four nav constellations as constellation', () => {
    for (const id of ['gps', 'galileo', 'glonass', 'beidou']) {
      expect(categoriseEarthSatellite(id)).toBe('constellation');
    }
  });

  it('classifies space observatories as telescope', () => {
    for (const id of ['hubble', 'chandra', 'xmm', 'jwst', 'gaia']) {
      expect(categoriseEarthSatellite(id)).toBe('telescope');
    }
  });

  it('classifies the GEO entry as comsat', () => {
    expect(categoriseEarthSatellite('geo')).toBe('comsat');
  });

  it('classifies LRO as moon-orbiter (its orbit is around the Moon, not Earth)', () => {
    expect(categoriseEarthSatellite('lro')).toBe('moon-orbiter');
  });

  it('falls back to telescope for unknown ids (defence in depth)', () => {
    expect(categoriseEarthSatellite('made-up-future-sat')).toBe('telescope');
  });
});
