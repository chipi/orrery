import { describe, it, expect } from 'vitest';
import { luminosityClass, portraitParams } from './star-portrait';

describe('luminosityClass', () => {
  it('parses the roman-numeral class from a spectral type', () => {
    expect(luminosityClass('K5III')).toBe('III');
    expect(luminosityClass('M2Ib')).toBe('Ib');
    expect(luminosityClass('A7IV-V')).toBe('IV');
    expect(luminosityClass('G2V')).toBe('V');
    expect(luminosityClass('B0Ia')).toBe('Ia');
  });

  it('returns null for missing or non-classed types', () => {
    expect(luminosityClass(null)).toBeNull();
    expect(luminosityClass('DA')).toBeNull(); // white dwarf spectral, no roman class
  });
});

describe('portraitParams', () => {
  it('makes supergiants larger + more diffuse than dwarfs', () => {
    const supergiant = portraitParams('M2Ib', -5);
    const dwarf = portraitParams('G2V', 4.8);
    expect(supergiant.coronaScale).toBeGreaterThan(dwarf.coronaScale);
    expect(supergiant.coreScale).toBeGreaterThan(dwarf.coreScale);
  });

  it('keeps all scales within the canvas bounds (0..1)', () => {
    for (const s of ['M2Ib', 'K5III', 'A7IV', 'G2V', null]) {
      const p = portraitParams(s, 2);
      for (const v of [p.coreScale, p.coronaScale, p.spikeStrength]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('spikes brighter (more negative absmag) stars more strongly', () => {
    expect(portraitParams('B0Ia', -6).spikeStrength).toBeGreaterThan(
      portraitParams('M5V', 13).spikeStrength,
    );
  });
});
