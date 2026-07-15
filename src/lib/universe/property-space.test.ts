import { describe, it, expect } from 'vitest';
import {
  absoluteMagnitude,
  hrX,
  hrY,
  SPECTRAL_CLASSES,
  SUN_BV,
  SUN_ABSMAG,
  tempKelvin,
  mpX,
  mpY,
  SOLAR_REFERENCES,
} from './property-space';

describe('absoluteMagnitude', () => {
  it('equals apparent magnitude at 10 pc', () => {
    expect(absoluteMagnitude(5, 10)).toBeCloseTo(5, 6);
  });
  it('is brighter (smaller) for a nearer star at fixed apparent mag', () => {
    // M = m − 5(log10 d − 1); at 1 pc, M = m + 5.
    expect(absoluteMagnitude(5, 1)).toBeCloseTo(10, 6);
    // at 100 pc, M = m − 5.
    expect(absoluteMagnitude(5, 100)).toBeCloseTo(0, 6);
  });
  it('the Sun (m = −26.7 at ~4.85e−6 pc) has Mᵥ ≈ 4.83', () => {
    const distPc = 1 / 206265; // 1 AU in pc
    expect(absoluteMagnitude(-26.74, distPc)).toBeCloseTo(4.83, 0);
  });
  it('handles non-positive distance gracefully', () => {
    expect(absoluteMagnitude(3, 0)).toBe(3);
  });
});

describe('hrX (temperature axis)', () => {
  it('hot blue stars sit left (→0), cool red right (→1)', () => {
    expect(hrX(-0.3)).toBeLessThan(0.1);
    expect(hrX(1.6)).toBeGreaterThan(0.9);
  });
  it('is monotonic increasing in B–V and clamped to [0,1]', () => {
    expect(hrX(0.0)).toBeLessThan(hrX(0.8));
    expect(hrX(-5)).toBe(0);
    expect(hrX(5)).toBe(1);
  });
});

describe('hrY (luminosity axis)', () => {
  it('luminous (small Mᵥ) sits top (→0), faint (large Mᵥ) bottom (→1)', () => {
    expect(hrY(-6)).toBeLessThan(0.1);
    expect(hrY(15)).toBeGreaterThan(0.9);
  });
  it('is monotonic + clamped', () => {
    expect(hrY(0)).toBeLessThan(hrY(10));
    expect(hrY(-100)).toBe(0);
    expect(hrY(100)).toBe(1);
  });
});

describe('the Sun lands on the main sequence (mid-chart)', () => {
  it('Sun x is around the G class, y around the middle', () => {
    const sx = hrX(SUN_BV);
    const sy = hrY(SUN_ABSMAG);
    expect(sx).toBeGreaterThan(0.4);
    expect(sx).toBeLessThan(0.6);
    expect(sy).toBeGreaterThan(0.4);
    expect(sy).toBeLessThan(0.6);
  });
});

describe('SPECTRAL_CLASSES + tempKelvin', () => {
  it('classes run O→M with increasing B–V (decreasing temperature)', () => {
    const bvs = SPECTRAL_CLASSES.map((c) => c.bv);
    for (let i = 1; i < bvs.length; i++) expect(bvs[i]).toBeGreaterThan(bvs[i - 1]);
    expect(SPECTRAL_CLASSES[0].label).toBe('O');
    expect(SPECTRAL_CLASSES.at(-1)!.label).toBe('M');
  });
  it('a hot O star is far hotter than a cool M star', () => {
    expect(tempKelvin(-0.3)).toBeGreaterThan(tempKelvin(1.45));
    expect(tempKelvin(-0.3)).toBeGreaterThan(15000);
  });
});

describe('mass–period axes (mpX / mpY)', () => {
  it('short-period planets sit left (→0), long-period right (→1)', () => {
    expect(mpX(1)).toBeLessThan(mpX(1000));
    expect(mpX(0.01)).toBe(0); // below the plotted floor, clamped
    expect(mpX(1e9)).toBe(1); // above the ceiling, clamped
  });
  it('massive planets sit top (→0), light bottom (→1) — inverted', () => {
    expect(mpY(1000)).toBeLessThan(mpY(1)); // Jupiter-class above Earth-class
    expect(mpY(1e6)).toBe(0);
    expect(mpY(1e-6)).toBe(1);
  });
  it('Earth and Jupiter land inside the plotted box', () => {
    for (const ref of SOLAR_REFERENCES) {
      expect(mpX(ref.periodDays)).toBeGreaterThanOrEqual(0);
      expect(mpX(ref.periodDays)).toBeLessThanOrEqual(1);
      expect(mpY(ref.massEarth)).toBeGreaterThan(0);
      expect(mpY(ref.massEarth)).toBeLessThan(1);
    }
    // Jupiter is more massive → higher (smaller y) than Earth.
    const earth = SOLAR_REFERENCES.find((r) => r.label === 'Earth')!;
    const jup = SOLAR_REFERENCES.find((r) => r.label === 'Jupiter')!;
    expect(mpY(jup.massEarth)).toBeLessThan(mpY(earth.massEarth));
  });
});
