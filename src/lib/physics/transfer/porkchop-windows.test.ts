/**
 * The porkchop's launch windows against the real sky. Reference: the dates the JPL Keplerian
 * ephemeris (`physics/ephemeris`, the same elements the blueprints and the sky views use) gives
 * the Hohmann phase angle — target longitude − Earth longitude = π(1 − ((1+r)/2r)^1.5). Every
 * porkchop valley must sit within weeks of one (a Lambert optimum is not a
 * Hohmann transfer, and Mars' eccentricity moves its optimum by ~5 weeks: the 2026 grid minimum is
 * 10-30, the NASA handbook's lowest-energy departures Oct 31 / Nov 14, the circular phase 12-05).
 *
 * Guards the 2026-11-06 bug: grid days (from 2026-01-01) were placed with J2000 elements and no
 * offset, so every planet but Earth was out of phase — Jupiter's window ~80 days early, Venus'
 * months off — while a hand-set Mars L0 hid it for Mars and broke /fly's Mars instead.
 */
import { describe, expect, it } from 'vitest';
import { computePorkchopGrid, DV_FAILED } from './lambert-grid';
import { solveLambertPrograde, solveLambert } from './lambert';
import { MU_SUN, type DestinationId } from './lambert-grid.constants';
import { heliocentric, julianDay, type PlanetId } from '../ephemeris';

const GRID_EPOCH_MS = Date.UTC(2026, 0, 1);
const A_AU: Record<string, number> = {
  venus: 0.7233,
  mars: 1.5237,
  jupiter: 5.2034,
  saturn: 9.5371,
};

/** JPL-ephemeris Hohmann phase dates (grid days) in [0, spanDays]. */
function jplHohmannDays(dest: string, spanDays: number): number[] {
  const r = A_AU[dest]!;
  const theta = Math.PI * (1 - Math.pow((1 + r) / (2 * r), 1.5));
  const wrap = (a: number) =>
    ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const out: number[] = [];
  let prev: number | null = null;
  for (let day = 0; day <= spanDays; day++) {
    const jd = julianDay(new Date(GRID_EPOCH_MS + day * 86_400_000));
    const e = heliocentric('earth' as PlanetId, jd);
    const t = heliocentric(dest as PlanetId, jd);
    const f = wrap(Math.atan2(t.y, t.x) - Math.atan2(e.y, e.x) - theta);
    if (prev !== null && Math.sign(prev) !== Math.sign(f) && Math.abs(prev - f) < 1) out.push(day);
    prev = f;
  }
  return out;
}

/** Best (lowest-Δv) departure day of the grid within ±halfWindow of `aroundDay`. */
function bestDepartureNear(
  dest: DestinationId,
  aroundDay: number,
  halfWindow: number,
  tof: [number, number],
): { day: number; dv: number } {
  const res = computePorkchopGrid(
    {
      id: 0,
      depRange: [aroundDay - halfWindow, aroundDay + halfWindow],
      arrRange: tof,
      steps: [90, 60],
      destinationId: dest,
    },
    () => {},
    () => false,
  )!;
  let best = { day: NaN, dv: Infinity };
  res.grid.forEach((row) =>
    row.forEach((dv, i) => {
      if (dv < best.dv) best = { day: res.depDays[i]!, dv };
    }),
  );
  return best;
}

describe('porkchop windows match the JPL Hohmann phase dates', () => {
  const cases: [DestinationId, [number, number], number, number][] = [
    // destination, TOF range (days), tolerance (days), Hohmann Δv (km/s, circular textbook)
    ['venus', [80, 320], 21, 5.21],
    ['mars', [120, 400], 35, 5.59],
    ['jupiter', [700, 1400], 21, 14.43],
  ];
  for (const [dest, tof, tol, hohmannDv] of cases) {
    it(`${dest}: every window within ${tol} days of the JPL date, Δv near Hohmann`, () => {
      const refs = jplHohmannDays(dest, 1460);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        const { day, dv } = bestDepartureNear(dest, ref, 120, tof);
        expect(Math.abs(day - ref)).toBeLessThanOrEqual(tol);
        expect(dv).toBeLessThan(DV_FAILED);
        expect(Math.abs(dv - hohmannDv)).toBeLessThan(0.25);
      }
    });
  }
});

describe('solveLambertPrograde — long-way and slow transfers', () => {
  it('solves a prograde Earth → Venus transfer sweeping more than 180°', () => {
    // Venus 200° ahead of Earth: the short-way chord answer would be retrograde.
    const r1: [number, number] = [1, 0];
    const ang = (200 * Math.PI) / 180;
    const r2: [number, number] = [0.723 * Math.cos(ang), 0.723 * Math.sin(ang)];
    const res = solveLambertPrograde(r1, r2, 180 / 365.25, MU_SUN);
    expect(res).not.toBeNull();
    // A prograde long-way transfer to an inner planet sweeps 200° in 180 d: a is between the two orbits.
    expect(res!.a).toBeGreaterThan(0.723 / 2);
    expect(res!.a).toBeLessThan(1.2);
  });

  it('matches the plain short-way solve when the transfer is under 180°', () => {
    const r1: [number, number] = [1, 0];
    const r2: [number, number] = [0, 1.524];
    const a = solveLambertPrograde(r1, r2, 200 / 365.25, MU_SUN)!;
    const b = solveLambert(r1, r2, 200 / 365.25, MU_SUN)!;
    expect(a.a).toBeCloseTo(b.a, 9);
  });
});
