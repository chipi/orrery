/**
 * Heliocentric ephemerides + the µ_Sun constant for Lambert + porkchop
 * geometry. Sourced directly from `static/data/planets.json` and
 * `static/data/small-bodies.json` at build time via Vite's JSON import —
 * keeps the worker in sync with the data layer without runtime fetches
 * (workers can't use SvelteKit's `$lib/data` client; Vite resolves JSON
 * imports statically).
 *
 * v0.1.6 (ADR-026): Earth → 5 planets (Mercury–Saturn).
 * v0.3.x (ADR-028): + Uranus, Neptune, Pluto, Ceres (9 destinations).
 */

import planetsData from '../../static/data/planets.json';
import smallBodiesData from '../../static/data/small-bodies.json';

type PlanetEntry = {
  name: string;
  a: number;
  e: number;
  T: number;
  L0: number;
};

type SmallBodyEntry = {
  id: string;
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

function smallBody(id: string): SmallBodyEntry {
  const b = smallBodiesData.bodies.find((x) => x.id === id);
  if (!b) throw new Error(`Missing small body "${id}" in static/data/small-bodies.json`);
  return b;
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

// ─── Multi-destination support (ADR-026 + ADR-028) ─────────────────

export type DestinationId =
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'ceres';

export interface DestinationConstants {
  id: DestinationId;
  /** Heliocentric semi-major axis, AU. */
  a: number;
  /** Mean longitude at epoch, rad. */
  a0: number;
  /** Mean motion, rad/day. */
  meanMotionRadPerDay: number;
  /** Eccentricity; omitted or 0 ⇒ circular position model. ADR-028: required for Pluto (and populated for all bodies from data). */
  e?: number;
}

function buildPlanetDestination(id: DestinationId, name: string): DestinationConstants {
  const p = planet(name);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
  };
}

function buildDwarfDestination(id: 'ceres' | 'pluto'): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    /** ADR-028: eccentric arrival only for Pluto. Ceres uses a circular a (e≈0.08 breaks Lambert porkchop convergence across the grid). */
    ...(id === 'pluto' ? { e: p.e } : {}),
  };
}

/** Lookup table for porkchop / arc destinations. Mars stays in step
 *  with the legacy MARS_* exports above so a misedit shows up as a
 *  test failure rather than a silent drift. */
export const DESTINATIONS: Record<DestinationId, DestinationConstants> = {
  mercury: buildPlanetDestination('mercury', 'Mercury'),
  venus: buildPlanetDestination('venus', 'Venus'),
  mars: buildPlanetDestination('mars', 'Mars'),
  jupiter: buildPlanetDestination('jupiter', 'Jupiter'),
  saturn: buildPlanetDestination('saturn', 'Saturn'),
  uranus: buildPlanetDestination('uranus', 'Uranus'),
  neptune: buildPlanetDestination('neptune', 'Neptune'),
  pluto: buildDwarfDestination('pluto'),
  ceres: buildDwarfDestination('ceres'),
};
