/**
 * /fly's planet positions (`destinationPos`, shared with the /plan porkchop grid and the Lab)
 * against the JPL Keplerian ephemeris the blueprints and the sky views use, 1970–2035.
 *
 * Guards the 2026-11-06 fix: the planets were placed on circles of radius a, so Mercury sat up
 * to 24° from its real longitude, Mars 10.8°, the giants 5–6°, and flyby anchors missed the
 * mission dates' real geometry. With each planet's eccentricity the error is under 0.5°.
 * `scripts/fly/planet-model-check.ts` prints the same table.
 */
import { describe, expect, it } from 'vitest';
import { destinationPos, earthPos, orbitPath } from './mission-arc';
import { DESTINATIONS, type DestinationId } from './lambert-grid.constants';
import { heliocentric, julianDay, type PlanetId } from '../ephemeris';
import { dateToSimDay } from '../../sim-day';

const PLANETS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
const wrapDeg = (d: number) => ((d + 540) % 360) - 180;
const lonDeg = (x: number, y: number) => (Math.atan2(y, x) * 180) / Math.PI;

describe('destinationPos matches the JPL ephemeris', () => {
  for (const p of PLANETS) {
    it(`${p}: longitude within 0.6°, radius within 1.5 % over 1970–2035`, () => {
      for (let ms = Date.UTC(1970, 0, 1); ms < Date.UTC(2035, 0, 1); ms += 29 * 86_400_000) {
        const iso = new Date(ms).toISOString().slice(0, 10);
        const d = dateToSimDay(iso)!;
        const sim = p === 'earth' ? earthPos(d) : destinationPos(d, p as DestinationId);
        const jpl = heliocentric(p as PlanetId, julianDay(new Date(ms + 43_200_000)));
        expect(Math.abs(wrapDeg(lonDeg(sim.x, sim.z) - lonDeg(jpl.x, jpl.y)))).toBeLessThan(0.6);
        const rJ = Math.hypot(jpl.x, jpl.y);
        expect(Math.abs(Math.hypot(sim.x, sim.z) - rJ) / rJ).toBeLessThan(0.015);
      }
    });
  }
});

describe('orbitPath', () => {
  it('passes through the body on any day (the drawn ring is the eccentric orbit)', () => {
    const path = orbitPath('mercury', 720);
    const T = (2 * Math.PI) / DESTINATIONS.mercury.meanMotionRadPerDay;
    for (const day of [0, 17, 40, 63, 9497]) {
      const b = destinationPos(day, 'mercury');
      const miss = Math.min(...path.map((q) => Math.hypot(q.x - b.x, q.z - b.z)));
      expect(miss).toBeLessThan(0.002);
    }
    expect(path.length).toBe(721);
    expect(T).toBeCloseTo(87.97, 0);
  });
});
