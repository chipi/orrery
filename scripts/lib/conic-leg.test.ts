import { describe, expect, it } from 'vitest';
import { ellipseFrom, lambertLeg, MU_SUN_AU3_D2 } from './conic-leg';

const AU_PER_DAY_TO_KMS = 149_597_870.7 / 86_400;
const speedKms = (f: (t: number) => { x: number; z: number }, t: number) => {
  const a = f(t - 0.01);
  const b = f(t + 0.01);
  return (Math.hypot(b.x - a.x, b.z - a.z) / 0.02) * AU_PER_DAY_TO_KMS;
};

describe('lambertLeg', () => {
  it('recovers a known orbit for short, long and near-full transfer angles', () => {
    const r1 = { x: 1, z: 0 };
    // An eccentric prograde orbit through r1: 10 % above circular speed, a little outward.
    const v1 = { x: 0.002, z: 0.0172 * 1.1 };
    const truth = ellipseFrom(r1, v1, MU_SUN_AU3_D2)!;
    for (const tof of [60, 200, 330]) {
      const r2 = truth(tof);
      const leg = lambertLeg(r1, r2, tof);
      expect(leg, `tof ${tof}`).not.toBeNull();
      for (const t of [tof * 0.25, tof * 0.5, tof * 0.75]) {
        const a = truth(t);
        const b = leg!(t);
        expect(Math.hypot(a.x - b.x, a.z - b.z), `tof ${tof} t ${t}`).toBeLessThan(1e-4);
      }
    }
  });

  it('flies the Earth → Mars Hohmann ellipse at its textbook speeds', () => {
    const rMars = 1.524;
    const a = (1 + rMars) / 2;
    const halfPeriod = Math.PI * Math.sqrt((a * a * a) / MU_SUN_AU3_D2);
    // 179° rather than 180°: the exact half-turn has no unique plane.
    const th = (179 * Math.PI) / 180;
    const tof = halfPeriod * 0.99;
    const leg = lambertLeg(
      { x: 1, z: 0 },
      { x: rMars * Math.cos(th), z: rMars * Math.sin(th) },
      tof,
    );
    expect(leg).not.toBeNull();
    expect(speedKms(leg!, 0.02)).toBeGreaterThan(32.0);
    expect(speedKms(leg!, 0.02)).toBeLessThan(33.5); // vis-viva at perihelion: 32.7 km/s
  });

  it('recovers an escape (hyperbolic) orbit', () => {
    const r1 = { x: 1, z: 0 };
    const truth = ellipseFrom(r1, { x: 0.004, z: 0.0172 * 1.5 }, MU_SUN_AU3_D2)!;
    const r2 = truth(400);
    const leg = lambertLeg(r1, r2, 400);
    expect(leg).not.toBeNull();
    const a = truth(200);
    const b = leg!(200);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1e-4);
  });

  it('returns null for a whole-revolution leg (same direction from the Sun)', () => {
    expect(lambertLeg({ x: 1, z: 0 }, { x: 1.2, z: 0 }, 365)).toBeNull();
  });
});
