import { describe, expect, it } from 'vitest';
import { bodyHelioVelXY, bodyHelioXY, lambertEndVelocities } from './helio-state';
import { solveLambertPrograde } from './lambert';
import { DESTINATIONS, EARTH_ORBIT, MU_SUN } from './lambert-grid.constants';

describe('lambertEndVelocities', () => {
  // Short way (Mars 100° ahead) and long way (Venus 200° ahead).
  const cases: [string, [number, number], number][] = [
    ['short way', [1.524 * Math.cos(1.745), 1.524 * Math.sin(1.745)], 200],
    ['long way', [0.723 * Math.cos(3.491), 0.723 * Math.sin(3.491)], 180],
  ];
  for (const [name, r2, tofDays] of cases) {
    it(`${name}: speeds at both ends equal the Lambert solution's, angular momentum is √(µp)`, () => {
      const r1: [number, number] = [1, 0];
      const sol = solveLambertPrograde(r1, r2, tofDays / 365.25, MU_SUN)!;
      const ends = lambertEndVelocities(r1, r2, sol.p, MU_SUN)!;
      expect(Math.hypot(...ends.v1)).toBeCloseTo(sol.v1, 6);
      expect(Math.hypot(...ends.v2)).toBeCloseTo(sol.v2, 6);
      const h1 = r1[0] * ends.v1[1] - r1[1] * ends.v1[0];
      const h2 = r2[0] * ends.v2[1] - r2[1] * ends.v2[0];
      expect(h1).toBeCloseTo(Math.sqrt(MU_SUN * sol.p), 6); // prograde, conserved
      expect(h2).toBeCloseTo(h1, 6);
    });
  }
});

describe('bodyHelioVelXY', () => {
  it('Earth: vis-viva speed and prograde motion on its eccentric orbit', () => {
    for (const day of [0, 91, 183, 274]) {
      const [x, y] = bodyHelioXY(day, EARTH_ORBIT);
      const [vx, vy] = bodyHelioVelXY(day, EARTH_ORBIT);
      const r = Math.hypot(x, y);
      expect(Math.hypot(vx, vy)).toBeCloseTo(Math.sqrt(MU_SUN * (2 / r - 1 / EARTH_ORBIT.a)), 3);
      expect(x * vy - y * vx).toBeGreaterThan(0);
    }
  });

  it('Mars has a radial velocity (≈2 km/s at most) that a tangential model drops', () => {
    let maxRadialKms = 0;
    for (let day = 0; day < 687; day += 3) {
      const [x, y] = bodyHelioXY(day, DESTINATIONS.mars);
      const [vx, vy] = bodyHelioVelXY(day, DESTINATIONS.mars);
      const vr = (x * vx + y * vy) / Math.hypot(x, y);
      maxRadialKms = Math.max(maxRadialKms, Math.abs(vr) * 4.7404);
    }
    expect(maxRadialKms).toBeGreaterThan(1.9);
    expect(maxRadialKms).toBeLessThan(2.3);
  });
});
