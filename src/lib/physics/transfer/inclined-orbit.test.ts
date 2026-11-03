import { describe, expect, it } from 'vitest';
import { destinationPos, earthPos } from './mission-arc';
/** Sim days from 2000-01-01 (the sim-day epoch). */
const dateToSimDay = (date: string): number =>
  (Date.parse(`${date}T00:00:00Z`) - Date.UTC(2000, 0, 1)) / 86_400_000;

const at = (date: string) => {
  const day = dateToSimDay(date);
  const p = destinationPos(day, 'halley');
  const e = earthPos(day);
  return { r: Math.hypot(p.x, p.z), fromEarth: Math.hypot(p.x - e.x, p.z - e.z) };
};

describe('Halley on its retrograde orbit', () => {
  it('is at perihelion on 1986-02-09 (q 0.575 AU, ecliptic projection)', () => {
    expect(at('1986-02-09').r).toBeCloseTo(0.57, 1);
  });

  it('meets Giotto on 1986-03-14 ~0.9 AU from the Sun and ~1 AU from Earth', () => {
    const g = at('1986-03-14');
    expect(g.r).toBeGreaterThan(0.85);
    expect(g.r).toBeLessThan(0.95);
    expect(g.fromEarth).toBeGreaterThan(0.9);
    expect(g.fromEarth).toBeLessThan(1.05);
  });

  it('moves clockwise in the ecliptic (retrograde)', () => {
    const day = dateToSimDay('1986-03-14');
    const a = destinationPos(day, 'halley');
    const b = destinationPos(day + 1, 'halley');
    expect(a.x * b.z - a.z * b.x).toBeLessThan(0);
  });
});
