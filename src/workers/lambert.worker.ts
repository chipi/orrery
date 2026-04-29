/**
 * Lambert worker — runs the porkchop computation off the main thread (ADR-008).
 *
 * Protocol per RFC-003, locked in ADR-022 (2026-04-28):
 *   Main → Worker: { id, depRange, arrRange, steps }
 *   Worker → Main: { id, progress }                        (every 10 rows)
 *   Worker → Main: { id, grid, depDays, arrDays }          (final result)
 *
 * Cancellation by monotonic id: if a new request arrives mid-computation,
 * the worker compares its current id against the latest request and bails
 * before posting stale results. The main thread also checks the id on
 * received messages and discards anything not matching the current request.
 */

import { solveLambert } from '$lib/lambert';

const MU_SUN = 4 * Math.PI ** 2;

// Earth and Mars orbital parameters (epoch Jan 1 2026, per P02 prototype).
const R_EARTH = 1.0;
const R_MARS = 1.524;
const EARTH_A0 = 1.678;
const MARS_A0 = 5.136;
const EARTH_W = (2 * Math.PI) / 365.25;
const MARS_W = (2 * Math.PI) / 686.97;
const V_EARTH_CIRC = Math.sqrt(MU_SUN / R_EARTH);
const V_MARS_CIRC = Math.sqrt(MU_SUN / R_MARS);
const AU_PER_YR_TO_KMS = 4.7404;

const DV_FAILED = 28; // Sentinel for "no solution" — high enough to render as deep red

export interface LambertRequest {
  id: number;
  /** Departure day range relative to epoch [start, end] in days */
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

let currentId = -1;

self.addEventListener('message', (event: MessageEvent<LambertRequest>) => {
  const req = event.data;
  currentId = req.id;
  computePorkchop(req);
});

function computePorkchop(req: LambertRequest): void {
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
    // Bail out if a newer request superseded ours.
    if (req.id !== currentId) return;

    grid[j] = new Array(w);
    const tofDay = arrDays[j];
    const tofYr = tofDay / 365.25;

    for (let i = 0; i < w; i++) {
      const depDay = depDays[i];
      const arrDay = depDay + tofDay;
      grid[j][i] = computeDv(depDay, arrDay, tofYr);
    }

    // Progress every 10 rows (or on the final row).
    if (j % 10 === 0 || j === h - 1) {
      const progressMessage: LambertProgress = { id: req.id, progress: (j + 1) / h };
      (self as unknown as Worker).postMessage(progressMessage);
    }
  }

  // One last id check before posting result.
  if (req.id !== currentId) return;
  const result: LambertGrid = { id: req.id, grid, depDays, arrDays };
  (self as unknown as Worker).postMessage(result);
}

function computeDv(depDay: number, arrDay: number, tofYr: number): number {
  const tE = EARTH_A0 + EARTH_W * depDay;
  const tM = MARS_A0 + MARS_W * arrDay;
  const r1: [number, number] = [R_EARTH * Math.cos(tE), R_EARTH * Math.sin(tE)];
  const r2: [number, number] = [R_MARS * Math.cos(tM), R_MARS * Math.sin(tM)];

  const result = solveLambert(r1, r2, tofYr, MU_SUN);
  if (!result) return DV_FAILED;

  const dvAuPerYr = Math.abs(result.v1 - V_EARTH_CIRC) + Math.abs(V_MARS_CIRC - result.v2);
  const dvKmS = dvAuPerYr * AU_PER_YR_TO_KMS;
  return Math.max(3.2, Math.min(dvKmS, DV_FAILED));
}
