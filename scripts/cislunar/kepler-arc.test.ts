import { describe, expect, it } from 'vitest';
import { lambertArc } from './kepler-arc';

const MU = 398600.4418;
const DAY = 86400;
const r = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe('lambertArc', () => {
  // An Apollo-like trip home: from the Moon's distance to entry interface, 170° round, 2.5 days.
  const moon = { x: 383_000, y: 0, z: 0 };
  const ei = {
    x: -6_500 * Math.cos((10 * Math.PI) / 180),
    y: 0,
    z: 6_500 * Math.sin((10 * Math.PI) / 180),
  };
  const arc = lambertArc(moon, ei, 2.5 * DAY, MU)!;

  it('joins the two points in the flown time', () => {
    expect(r(arc(0))).toBeCloseTo(383_000, -2);
    const end = arc(2.5 * DAY);
    expect(Math.hypot(end.x - ei.x, end.y - ei.y, end.z - ei.z)).toBeLessThan(500);
  });

  it('leaves the Moon slowly and reaches Earth fast, as a real coast home does', () => {
    // A day out it is still well over half the way from Earth (Apollo 11: about 300,000 km).
    expect(r(arc(1 * DAY))).toBeGreaterThan(250_000);
    // The radius only falls.
    let prev = Infinity;
    for (let t = 0; t <= 2.5 * DAY; t += 0.05 * DAY) {
      expect(r(arc(t))).toBeLessThanOrEqual(prev + 1);
      prev = r(arc(t));
    }
  });

  it('declines what it cannot draw', () => {
    expect(lambertArc(moon, { x: 2 * moon.x, y: 0, z: 0 }, DAY, MU)).toBeNull(); // collinear
    expect(lambertArc(moon, ei, -1, MU)).toBeNull();
  });
});
