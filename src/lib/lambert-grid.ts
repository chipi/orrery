/**
 * Pure-function porkchop-grid computation. Lives in `$lib` (not in
 * `src/workers/`) so it can be unit-tested without needing a real
 * Worker context — Vitest's jsdom doesn't ship `self`/Worker globals.
 *
 * The Lambert worker (`src/workers/lambert.worker.ts`) is now a thin
 * shell that wires `self.addEventListener('message', …)` to this
 * function and serialises progress + result over postMessage. The
 * worker tracks the most-recent-request id and feeds that into
 * `shouldCancel` so a new request implicitly cancels any in-flight
 * compute (RFC-003 / ADR-022).
 *
 * Earth/Mars heliocentric model is the same one used in `/explore` —
 * see `lambert-grid.constants.ts` for the values, derived from
 * `static/data/planets.json` at build time so they stay in sync.
 */

import { solveLambert } from './lambert';
import {
  DESTINATIONS,
  EARTH_A0,
  EARTH_MEAN_MOTION_RAD_PER_DAY,
  MU_SUN,
  R_EARTH_AU,
  type DestinationId,
} from './lambert-grid.constants';

const V_EARTH_CIRC = Math.sqrt(MU_SUN / R_EARTH_AU);
const AU_PER_YR_TO_KMS = 4.7404;

/** Sentinel ∆v for cells where Lambert returned no solution. Clamps
 * into the deep-red end of the colour scale so failed cells render
 * as visually unreachable. */
export const DV_FAILED = 28;

export interface LambertRequest {
  id: number;
  /** Departure day range [start, end] in days from epoch */
  depRange: [number, number];
  /** Time-of-flight range [start, end] in days */
  arrRange: [number, number];
  /** Cell counts [width, height] */
  steps: [number, number];
  /** Destination planet. Defaults to 'mars' (back-compat with the
   *  pre-v0.1.6 worker shape). ADR-026 §Lambert worker change. */
  destinationId?: DestinationId;
}

export interface LambertProgress {
  id: number;
  progress: number;
}

export interface LambertGrid {
  id: number;
  /** 2D grid of ∆v values, indexed [row][col]. row = TOF axis, col = departure axis. */
  grid: number[][];
  /** Departure days (size = steps[0]). */
  depDays: number[];
  /** Time-of-flight days (size = steps[1]). */
  arrDays: number[];
}

/**
 * Compute the porkchop grid. Returns null if `shouldCancel` returns
 * true at any row boundary — the caller (worker) uses this to drop
 * partial results when a newer request supersedes this one.
 *
 * `onProgress` is invoked every 10 rows (and on the final row) with
 * a fraction in [0, 1]. The caller decides whether to surface those
 * progress values — the worker filters out stale ones via the same
 * id mechanism.
 */
export function computePorkchopGrid(
  req: LambertRequest,
  onProgress: (progress: number) => void,
  shouldCancel: () => boolean,
): Omit<LambertGrid, 'id'> | null {
  const [w, h] = req.steps;
  const [depStart, depEnd] = req.depRange;
  const [tofStart, tofEnd] = req.arrRange;
  const destination = DESTINATIONS[req.destinationId ?? 'mars'];

  const depDays: number[] = new Array(w);
  const arrDays: number[] = new Array(h);
  for (let i = 0; i < w; i++) {
    depDays[i] = depStart + (i / (w - 1)) * (depEnd - depStart);
  }
  for (let j = 0; j < h; j++) {
    arrDays[j] = tofStart + (j / (h - 1)) * (tofEnd - tofStart);
  }

  const grid: number[][] = new Array(h);
  for (let j = 0; j < h; j++) {
    if (shouldCancel()) return null;

    grid[j] = new Array(w);
    const tofDay = arrDays[j];
    const tofYr = tofDay / 365.25;

    for (let i = 0; i < w; i++) {
      const depDay = depDays[i];
      const arrDay = depDay + tofDay;
      grid[j][i] = computeDv(depDay, arrDay, tofYr, destination);
    }

    if (j % 10 === 0 || j === h - 1) {
      onProgress((j + 1) / h);
    }
  }

  if (shouldCancel()) return null;
  return { grid, depDays, arrDays };
}

/** Heliocentric position (AU) in the ecliptic plane. Matches
 * `mission-arc.destinationPos` (x/z) mapped to Lambert's [x,y]. */
function destinationHelioXY(
  day: number,
  destination: {
    a: number;
    a0: number;
    meanMotionRadPerDay: number;
    e?: number;
  },
): [number, number] {
  const e = destination.e ?? 0;
  const nu = destination.a0 + destination.meanMotionRadPerDay * day;
  const r = (destination.a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return [r * Math.cos(nu), r * Math.sin(nu)];
}

/** Heliocentric ∆v (km/s) for an Earth → destination transfer. Uses
 * the same eccentric orbit model as `destinationHelioXY`. Returns
 * DV_FAILED when Lambert can't find a feasible transfer. */
function computeDv(
  depDay: number,
  arrDay: number,
  tofYr: number,
  destination: { a: number; a0: number; meanMotionRadPerDay: number; e?: number },
): number {
  const tE = EARTH_A0 + EARTH_MEAN_MOTION_RAD_PER_DAY * depDay;
  const r1: [number, number] = [R_EARTH_AU * Math.cos(tE), R_EARTH_AU * Math.sin(tE)];
  const r2 = destinationHelioXY(arrDay, destination);
  const r2mag = Math.hypot(r2[0], r2[1]);
  const vDest = Math.sqrt(MU_SUN * (2 / r2mag - 1 / destination.a));

  const result = solveLambert(r1, r2, tofYr, MU_SUN);
  if (!result) return DV_FAILED;

  const dvAuPerYr = Math.abs(result.v1 - V_EARTH_CIRC) + Math.abs(vDest - result.v2);
  const dvKmS = dvAuPerYr * AU_PER_YR_TO_KMS;
  return Math.max(3.2, Math.min(dvKmS, DV_FAILED));
}
