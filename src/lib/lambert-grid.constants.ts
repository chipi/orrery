/**
 * Earth + Mars constants for the porkchop grid computation. Values
 * are sourced directly from `static/data/planets.json` at build time
 * via Vite's JSON import — keeps the worker in sync with the data
 * layer without runtime fetches (workers can't use SvelteKit's
 * `$lib/data` client; Vite resolves JSON imports statically).
 *
 * Audit note (2026-04-29): previously these constants were hardcoded
 * in `src/workers/lambert.worker.ts` with a small numeric drift
 * (R_MARS = 1.524 vs the data-layer value 1.52366). Sourcing from
 * the data file eliminates that drift class entirely.
 */

import planetsData from '../../static/data/planets.json';

type PlanetEntry = {
  name: string;
  a: number;
  e: number;
  T: number;
  L0: number;
};

function planet(name: string): PlanetEntry {
  const p = planetsData.planets.find((x) => x.name === name);
  if (!p) throw new Error(`Missing planet "${name}" in static/data/planets.json`);
  return p;
}

const EARTH = planet('Earth');
const MARS = planet('Mars');

export const MU_SUN = planetsData.constants.mu_sun;

/** Earth heliocentric distance, AU. Circular-orbit approximation. */
export const R_EARTH_AU = EARTH.a;
/** Mars heliocentric distance, AU. Circular-orbit approximation. */
export const R_MARS_AU = MARS.a;

/** Earth mean longitude at epoch (rad). */
export const EARTH_A0 = EARTH.L0;
/** Mars mean longitude at epoch (rad). */
export const MARS_A0 = MARS.L0;

/** Earth mean motion, rad/day (= 2π / T_days). */
export const EARTH_MEAN_MOTION_RAD_PER_DAY = (2 * Math.PI) / EARTH.T;
/** Mars mean motion, rad/day. */
export const MARS_MEAN_MOTION_RAD_PER_DAY = (2 * Math.PI) / MARS.T;
