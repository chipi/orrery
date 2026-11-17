import { describe, it, expect } from 'vitest';
import { toSchematicFrame, schematicMoon, scaledMoonDistance } from './horizons-frame';
import { A_MOON_KM, T_MOON_DAYS } from '../../src/lib/orbital/cislunar/cislunar-geometry';

// A real-looking Moon: 400,000 km, inclined, moving prograde at ~1 km/s.
const moon = { x: 280_000, y: 200_000, z: 200_000 };
const r = Math.hypot(moon.x, moon.y, moon.z);
const moonVel = { x: -0.6, y: 0.7, z: 0.2 };
const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('toSchematicFrame (F11, tier_2_published ingest)', () => {
  it('puts the real Moon on the drawn Moon at every MET', () => {
    for (const met of [0, 3.7, 9.6, 19.4, 25.4]) {
      const p = toSchematicFrame(moon, moon, moonVel, met);
      expect(dist(p, schematicMoon(met))).toBeLessThan(1e-6);
    }
  });

  it('keeps the Earth at the origin and scales distances to the schematic Earth-Moon distance', () => {
    expect(
      Math.hypot(...Object.values(toSchematicFrame({ x: 0, y: 0, z: 0 }, moon, moonVel, 5))),
    ).toBe(0);
    const craft = { x: moon.x + 1000, y: moon.y - 2000, z: moon.z + 500 };
    const p = toSchematicFrame(craft, moon, moonVel, 5);
    expect(dist(p, schematicMoon(5))).toBeCloseTo((Math.hypot(1000, 2000, 500) * A_MOON_KM) / r, 6);
    expect(scaledMoonDistance(craft, moon)).toBeCloseTo(dist(p, schematicMoon(5)), 6);
  });

  it('a point ahead of the Moon in its motion lands ahead of the drawn Moon', () => {
    // 10,000 km along the Moon's velocity (in its orbital plane).
    const v = Math.hypot(moonVel.x, moonVel.y, moonVel.z);
    const ahead = {
      x: moon.x + (moonVel.x / v) * 10_000,
      y: moon.y + (moonVel.y / v) * 10_000,
      z: moon.z + (moonVel.z / v) * 10_000,
    };
    const met = 2;
    const p = toSchematicFrame(ahead, moon, moonVel, met);
    const m = schematicMoon(met);
    // The drawn Moon moves towards +theta: direction (-sin, 0, cos).
    const th = (2 * Math.PI * met) / T_MOON_DAYS;
    const along = (p.x - m.x) * -Math.sin(th) + (p.z - m.z) * Math.cos(th);
    expect(along).toBeGreaterThan(9_000);
  });
});
