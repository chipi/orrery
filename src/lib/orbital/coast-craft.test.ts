import { describe, it, expect } from 'vitest';
import {
  craftScreenFraction,
  eccentricAnomaly,
  eccentricity,
  keplerRing,
  markerOpacity,
  markerWorldSize,
} from './coast-craft';

const R = 6371;

describe('keplerRing', () => {
  it('a circular orbit is the circle of its radius', () => {
    const pts = keplerRing(307, 307, 120);
    for (const p of pts) expect(Math.hypot(p.x, p.z)).toBeCloseTo(R + 307, 6);
    expect(pts[0].x).toBeCloseTo(R + 307, 6);
    expect(pts[0].z).toBeCloseTo(0, 6);
  });

  it('closes after one loop', () => {
    const pts = keplerRing(323, 38838, 240);
    expect(pts[0].x).toBeCloseTo(pts[240].x, 3);
    expect(pts[0].z).toBeCloseTo(pts[240].z, 3);
  });

  it('OTV-7: perigee 323 km on +x, apogee 38,838 km on -x, Earth at the focus', () => {
    const pts = keplerRing(323, 38838, 240);
    expect(pts[0].x).toBeCloseTo(R + 323, 3);
    expect(Math.abs(pts[120].x)).toBeCloseTo(R + 38838, 0);
    expect(pts[120].x).toBeLessThan(0);
    let rmin = Infinity;
    let rmax = 0;
    for (const p of pts) {
      rmin = Math.min(rmin, Math.hypot(p.x, p.z));
      rmax = Math.max(rmax, Math.hypot(p.x, p.z));
    }
    expect(rmin).toBeCloseTo(R + 323, 0);
    expect(rmax).toBeCloseTo(R + 38838, 0);
  });

  it('is uniform in mean anomaly: the craft is fast at perigee, slow at apogee', () => {
    const pts = keplerRing(323, 38838, 240);
    const step = (i: number) => Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
    expect(step(0)).toBeGreaterThan(step(118) * 5);
  });
});

describe('Kepler maths', () => {
  it('eccentricity of a circle is 0 and of OTV-7 about 0.74', () => {
    expect(eccentricity(300, 300)).toBe(0);
    expect(eccentricity(323, 38838)).toBeGreaterThan(0.73);
    expect(eccentricity(323, 38838)).toBeLessThan(0.75);
  });
  it('solves Kepler equation', () => {
    for (const e of [0, 0.3, 0.69, 0.9]) {
      for (const M of [0.1, 1, 2.5, 3.1, 5]) {
        const E = eccentricAnomaly(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 9);
      }
    }
  });
});

describe('craft size on screen and its marker', () => {
  it('the fraction of the view height falls with distance and rises with the craft', () => {
    const near = craftScreenFraction(1380, 3860, 48);
    const far = craftScreenFraction(1380, 16000, 48);
    expect(near).toBeGreaterThan(far * 4);
    expect(craftScreenFraction(1380, 3860, 48)).toBeCloseTo(
      1380 / (2 * 3860 * Math.tan(Math.PI / 7.5)),
      9,
    );
    expect(craftScreenFraction(100, 0, 48)).toBe(0);
  });

  it('the marker is full in a wide shot, gone in a close one, and eases between', () => {
    expect(markerOpacity(0.01)).toBe(1);
    expect(markerOpacity(0.06)).toBe(1);
    expect(markerOpacity(0.2)).toBe(0);
    const mid = markerOpacity(0.11);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(markerOpacity(0.09)).toBeGreaterThan(markerOpacity(0.13));
  });

  it('the marker keeps a constant share of the view whatever the distance', () => {
    for (const d of [3000, 16000, 60000]) {
      const size = markerWorldSize(d, 48, 0.07);
      expect(size / (2 * d * Math.tan(Math.PI / 7.5))).toBeCloseTo(0.07, 9);
    }
  });
});
