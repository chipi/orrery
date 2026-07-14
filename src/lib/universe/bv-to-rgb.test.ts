import { describe, it, expect } from 'vitest';
import { bvToKelvin, kelvinToRgb, bvToRgb } from './bv-to-rgb';

describe('bvToKelvin', () => {
  it('maps the Sun (B−V 0.656) to roughly its effective temperature', () => {
    const t = bvToKelvin(0.656);
    expect(t).toBeGreaterThan(5400);
    expect(t).toBeLessThan(6100);
  });

  it('maps a hot blue star (B−V 0.0, ~Vega) hotter than a cool red one (B−V 1.5)', () => {
    expect(bvToKelvin(0.0)).toBeGreaterThan(bvToKelvin(1.5));
  });

  it('is monotonically decreasing in B−V', () => {
    expect(bvToKelvin(-0.3)).toBeGreaterThan(bvToKelvin(0.0));
    expect(bvToKelvin(0.0)).toBeGreaterThan(bvToKelvin(0.6));
    expect(bvToKelvin(0.6)).toBeGreaterThan(bvToKelvin(2.0));
  });
});

describe('kelvinToRgb', () => {
  it('returns each channel normalized to 0..1', () => {
    for (const k of [1500, 3000, 5772, 10000, 30000]) {
      const rgb = kelvinToRgb(k);
      expect(rgb).toHaveLength(3);
      for (const c of rgb) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is red-dominant when cool and blue-dominant when hot', () => {
    const cool = kelvinToRgb(2000);
    expect(cool[0]).toBeGreaterThan(cool[2]); // R > B

    const hot = kelvinToRgb(30000);
    expect(hot[2]).toBeGreaterThan(hot[0]); // B > R
  });

  it('clamps out-of-range temperatures to the fitted band', () => {
    expect(kelvinToRgb(10)).toEqual(kelvinToRgb(1000));
    expect(kelvinToRgb(999999)).toEqual(kelvinToRgb(40000));
  });
});

describe('bvToRgb', () => {
  it('gives the Sun a warm off-white (all channels high, red ≥ blue)', () => {
    const [r, g, b] = bvToRgb(0.656);
    expect(r).toBeGreaterThan(0.9);
    expect(g).toBeGreaterThan(0.7);
    expect(b).toBeGreaterThan(0.6);
    expect(r).toBeGreaterThanOrEqual(b);
  });

  it('gives a hot star a blue-white cast (blue ≥ red)', () => {
    const [r, , b] = bvToRgb(-0.3);
    expect(b).toBeGreaterThanOrEqual(r);
  });

  it('clamps pathological B−V without throwing or producing NaN', () => {
    for (const bv of [-5, 10, Number.MAX_SAFE_INTEGER]) {
      const rgb = bvToRgb(bv);
      for (const c of rgb) expect(Number.isFinite(c)).toBe(true);
    }
  });
});
