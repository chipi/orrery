/**
 * How far /fly's planet positions (`destinationPos`, the mean-element model shared with the
 * /plan porkchop grid) sit from the JPL Keplerian ephemeris, per planet, over a span of
 * dates: max and RMS of the longitude error Δλ (deg) and the radius error Δr (AU).
 *
 *   npx tsx scripts/fly/planet-model-check.ts [fromYear toYear]   (default 1970 2035)
 *
 * Read-only. Use it after any change to lambert-grid.constants (elements, eccentricity).
 */
import { heliocentric, julianDay, type PlanetId } from '../../src/lib/physics/ephemeris';
import { destinationPos, earthPos } from '../../src/lib/physics/transfer/mission-arc';
import { dateToSimDay } from '../../src/lib/sim-day';
import type { DestinationId } from '../../src/lib/physics/transfer/lambert-grid.constants';

const [from, to] = process.argv.slice(2).map(Number);
const y0 = from || 1970;
const y1 = to || 2035;
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const wrap = (d: number) => ((d + 540) % 360) - 180;
const deg = (x: number, y: number) => (Math.atan2(y, x) * 180) / Math.PI;

for (const p of planets) {
  let maxL = 0;
  let sumL = 0;
  let maxR = 0;
  let n = 0;
  for (let ms = Date.UTC(y0, 0, 1); ms < Date.UTC(y1, 0, 1); ms += 5 * 86_400_000) {
    const iso = new Date(ms).toISOString().slice(0, 10);
    const d = dateToSimDay(iso)!;
    const sim = p === 'earth' ? earthPos(d) : destinationPos(d, p as DestinationId);
    const j = heliocentric(p as PlanetId, julianDay(new Date(ms + 43_200_000)));
    const dl = wrap(deg(sim.x, sim.z) - deg(j.x, j.y));
    const dr = Math.hypot(sim.x, sim.z) - Math.hypot(j.x, j.y);
    maxL = Math.max(maxL, Math.abs(dl));
    sumL += dl * dl;
    maxR = Math.max(maxR, Math.abs(dr));
    n++;
  }
  console.log(
    `${p.padEnd(8)} Δλ max ${maxL.toFixed(2).padStart(6)}°  rms ${Math.sqrt(sumL / n)
      .toFixed(2)
      .padStart(5)}°   Δr max ${maxR.toFixed(3)} AU`,
  );
}
