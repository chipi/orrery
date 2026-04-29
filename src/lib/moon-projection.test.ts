import { describe, it, expect } from 'vitest';
import { latLonToUnitSphere, latLonToEquirect } from './moon-projection';

describe('latLonToUnitSphere', () => {
  it('places (0°, 0°) on +X (prime meridian, equator)', () => {
    const p = latLonToUnitSphere(0, 0);
    expect(p.x).toBeCloseTo(1, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('places the north pole on +Y', () => {
    const p = latLonToUnitSphere(90, 0);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('places the south pole on -Y', () => {
    const p = latLonToUnitSphere(-90, 0);
    expect(p.y).toBeCloseTo(-1, 6);
  });

  it('+90° longitude (east) goes to -Z', () => {
    const p = latLonToUnitSphere(0, 90);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(-1, 6);
  });

  it('-90° longitude (west) goes to +Z', () => {
    const p = latLonToUnitSphere(0, -90);
    expect(p.z).toBeCloseTo(1, 6);
  });

  it('every output lies on the unit sphere', () => {
    for (const [lat, lon] of [
      [0, 0],
      [45, 30],
      [-30, 120],
      [89, -179],
      [12.34, 56.78],
    ]) {
      const p = latLonToUnitSphere(lat, lon);
      const r = Math.hypot(p.x, p.y, p.z);
      expect(r).toBeCloseTo(1, 6);
    }
  });
});

describe('latLonToEquirect', () => {
  const region = { x0: 0, y0: 0, mapW: 360, mapH: 180 };

  it('lon=-180 lands on the left edge', () => {
    expect(latLonToEquirect(0, -180, region).x).toBeCloseTo(0, 6);
  });

  it('lon=+180 lands on the right edge', () => {
    expect(latLonToEquirect(0, 180, region).x).toBeCloseTo(360, 6);
  });

  it('lon=0 lands at horizontal center', () => {
    expect(latLonToEquirect(0, 0, region).x).toBeCloseTo(180, 6);
  });

  it('lat=+90 lands on the top edge', () => {
    expect(latLonToEquirect(90, 0, region).y).toBeCloseTo(0, 6);
  });

  it('lat=-90 lands on the bottom edge', () => {
    expect(latLonToEquirect(-90, 0, region).y).toBeCloseTo(180, 6);
  });

  it('lat=0 lands at vertical center', () => {
    expect(latLonToEquirect(0, 0, region).y).toBeCloseTo(90, 6);
  });

  it('respects the (x0, y0) offset', () => {
    const offset = { x0: 50, y0: 20, mapW: 360, mapH: 180 };
    const p = latLonToEquirect(0, 0, offset);
    expect(p.x).toBeCloseTo(50 + 180, 6);
    expect(p.y).toBeCloseTo(20 + 90, 6);
  });

  it('Apollo 11 (0.67°N, 23.47°E) lands in the upper-right quadrant', () => {
    const p = latLonToEquirect(0.67, 23.47, region);
    expect(p.x).toBeGreaterThan(180);
    expect(p.y).toBeLessThan(90);
  });
});
