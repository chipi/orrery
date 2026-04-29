/**
 * Heliocentric ephemerides + the µ_Sun constant for Lambert + porkchop
 * geometry. Sourced directly from `static/data/planets.json` at build
 * time via Vite's JSON import — keeps the worker in sync with the
 * data layer without runtime fetches (workers can't use SvelteKit's
 * `$lib/data` client; Vite resolves JSON imports statically).
 *
 * v0.1.6 (ADR-026) extends from Earth + Mars to Earth + 5 destinations
 * (Mercury, Venus, Mars, Jupiter, Saturn). Earth/Mars exports stay for
 * backward compatibility with mission-arc and the worker. New code
 * should reach for `DESTINATIONS[id]` instead.
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

// ─── Multi-destination support (ADR-026, v0.1.6) ──────────────────

export type DestinationId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface DestinationConstants {
  id: DestinationId;
  /** Heliocentric distance, AU. Circular-orbit approximation. */
  a: number;
  /** Mean longitude at epoch, rad. */
  a0: number;
  /** Mean motion, rad/day. */
  meanMotionRadPerDay: number;
}

function buildDestination(id: DestinationId, name: string): DestinationConstants {
  const p = planet(name);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
  };
}

/** Lookup table for porkchop / arc destinations. Mars stays in step
 *  with the legacy MARS_* exports above so a misedit shows up as a
 *  test failure rather than a silent drift. */
export const DESTINATIONS: Record<DestinationId, DestinationConstants> = {
  mercury: buildDestination('mercury', 'Mercury'),
  venus: buildDestination('venus', 'Venus'),
  mars: buildDestination('mars', 'Mars'),
  jupiter: buildDestination('jupiter', 'Jupiter'),
  saturn: buildDestination('saturn', 'Saturn'),
};
