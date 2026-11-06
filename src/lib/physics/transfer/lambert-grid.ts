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

import { solveLambertPrograde } from './lambert';
import { bodyHelioVelXY, bodyHelioXY, lambertEndVelocities, type HelioBody } from './helio-state';
import {
  DESTINATIONS,
  EARTH_ORBIT,
  HELIO_GRID_EPOCH_SIM_DAY,
  MU_SUN,
  type DestinationId,
} from './lambert-grid.constants';

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

/** Heliocentric ∆v (km/s) for an Earth → destination transfer: |v∞| at departure plus |v∞|
 * at arrival, each the VECTOR difference between the transfer's velocity (Lagrange f/g from
 * the Lambert conic) and the body's own velocity on its eccentric orbit. Scalar or
 * "the planet moves tangentially" forms under-price fast transfers (S1) and, with eccentric
 * planets, miss up to ~2 km/s of Mars' radial motion. Returns DV_FAILED when Lambert can't
 * find a feasible transfer. */
function computeDv(depDay: number, arrDay: number, tofYr: number, destination: HelioBody): number {
  // Grid days count from 2026-01-01; the elements are at J2000.
  const t1 = depDay + HELIO_GRID_EPOCH_SIM_DAY;
  const t2 = arrDay + HELIO_GRID_EPOCH_SIM_DAY;
  const r1 = bodyHelioXY(t1, EARTH_ORBIT);
  const r2 = bodyHelioXY(t2, destination);

  const result = solveLambertPrograde(r1, r2, tofYr, MU_SUN);
  if (!result) return DV_FAILED;
  const ends = lambertEndVelocities(r1, r2, result.p, MU_SUN);
  if (!ends) return DV_FAILED;
  const vE = bodyHelioVelXY(t1, EARTH_ORBIT);
  const vD = bodyHelioVelXY(t2, destination);
  const vInfDeparture = Math.hypot(ends.v1[0] - vE[0], ends.v1[1] - vE[1]);
  const vInfArrival = Math.hypot(ends.v2[0] - vD[0], ends.v2[1] - vD[1]);
  const dvKmS = (vInfDeparture + vInfArrival) * AU_PER_YR_TO_KMS;
  return Math.max(3.2, Math.min(dvKmS, DV_FAILED));
}
