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
  EARTH_A0,
  EARTH_MEAN_MOTION_RAD_PER_DAY,
  MARS_A0,
  MARS_MEAN_MOTION_RAD_PER_DAY,
  MU_SUN,
  R_EARTH_AU,
  R_MARS_AU,
} from './lambert-grid.constants';

const V_EARTH_CIRC = Math.sqrt(MU_SUN / R_EARTH_AU);
const V_MARS_CIRC = Math.sqrt(MU_SUN / R_MARS_AU);
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
      grid[j][i] = computeDv(depDay, arrDay, tofYr);
    }

    if (j % 10 === 0 || j === h - 1) {
      onProgress((j + 1) / h);
    }
  }

  if (shouldCancel()) return null;
  return { grid, depDays, arrDays };
}

/** Heliocentric ∆v (km/s) for an Earth → Mars transfer using the
 * simplified circular-orbit model. Returns DV_FAILED when Lambert
 * can't find a feasible transfer. */
function computeDv(depDay: number, arrDay: number, tofYr: number): number {
  const tE = EARTH_A0 + EARTH_MEAN_MOTION_RAD_PER_DAY * depDay;
  const tM = MARS_A0 + MARS_MEAN_MOTION_RAD_PER_DAY * arrDay;
  const r1: [number, number] = [R_EARTH_AU * Math.cos(tE), R_EARTH_AU * Math.sin(tE)];
  const r2: [number, number] = [R_MARS_AU * Math.cos(tM), R_MARS_AU * Math.sin(tM)];

  const result = solveLambert(r1, r2, tofYr, MU_SUN);
  if (!result) return DV_FAILED;

  const dvAuPerYr = Math.abs(result.v1 - V_EARTH_CIRC) + Math.abs(V_MARS_CIRC - result.v2);
  const dvKmS = dvAuPerYr * AU_PER_YR_TO_KMS;
  return Math.max(3.2, Math.min(dvKmS, DV_FAILED));
}
