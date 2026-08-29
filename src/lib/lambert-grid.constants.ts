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
  /** Longitude of perihelion ϖ at J2000 (rad); see S2. */
  varpi?: number;
};

type SmallBodyEntry = {
  id: string;
  a: number;
  e: number;
  T: number;
  L0: number;
  /** Longitude of perihelion ϖ at J2000 (rad); see S2. */
  varpi?: number;
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
  | 'ceres'
  | 'vesta'
  | 'psyche'
  | 'bennu'
  | 'arrokoth'
  | 'halley'
  | '67p'
  // #341 Batch 5 body wiring — small-body destinations for missions
  // that previously routed through generic ASTEROID dest. Each gets
  // full per-body composition tuning so the hero shot at the iconic
  // mission moment composes correctly (DART/Dimorphos kinetic impact,
  // Lucy multi-Trojan encounters, Hayabusa/Itokawa station-keeping).
  | 'itokawa'
  | 'didymos'
  | 'dimorphos'
  | 'donaldjohanson'
  | 'eurybates'
  | 'polymele'
  | 'leucus'
  | 'orus'
  | 'patroclus'
  | 'menoetius';

/**
 * Geocentric (planet-orbiting) destinations. These have NO heliocentric orbit,
 * so they are deliberately NOT in `DestinationId` / the heliocentric
 * `DESTINATIONS` table / the Lambert worker — their porkchops are built
 * geocentrically in the precompute via `lambert-geocentric.ts` (ADR-085). The
 * Moon is the first; planetocentric moons of the giants follow.
 */
export type GeoDestinationId = 'moon';

/**
 * Planetary moons of the giants + Mars (ADR-086). Reached via a multi-leg
 * patched-conic mission (heliocentric Earth→host + moon-orbit insertion), NOT a
 * single Lambert arc — so they are their own category, distinct from the
 * geocentric Earth→Moon path. Their porkchops are built in the precompute via
 * `moon-transfer.ts` and ride their host planet's departure/TOF axes.
 */
export type MoonMissionDestId =
  | 'phobos'
  | 'deimos'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'titan'
  | 'enceladus'
  | 'triton';

/** Iteration/order-of-appearance list for the moon-mission destinations. */
export const MOON_MISSION_DEST_IDS: MoonMissionDestId[] = [
  'phobos',
  'deimos',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'titan',
  'enceladus',
  'triton',
];

/** Type guard: is this a multi-leg moon-mission destination (ADR-086)? */
export function isMoonMissionDest(id: PlanDestinationId): id is MoonMissionDestId {
  return (MOON_MISSION_DEST_IDS as string[]).includes(id);
}

/**
 * Every destination `/plan` can select and load a porkchop for: the
 * heliocentric Lambert set, the geocentric Earth→Moon path (ADR-085), and the
 * multi-leg moon missions (ADR-086). Use this where a value spans the models
 * (the `/plan` selector, the porkchop JSON contract, `getPorkchopGrid`); keep
 * `DestinationId` for the heliocentric-only Lambert path.
 */
export type PlanDestinationId = DestinationId | GeoDestinationId | MoonMissionDestId;

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
  /** Longitude of perihelion ϖ at J2000 (rad). Phases the eccentric conic so
   *  perihelion sits at ϖ, not at ecliptic longitude 0 (S2). Inert when e is
   *  0/omitted (circular model). Sourced from the data layer. */
  varpi?: number;
}

function buildPlanetDestination(id: DestinationId, name: string): DestinationConstants {
  const p = planet(name);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
  };
}

function buildDwarfDestination(id: 'ceres' | 'pluto'): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
    /** ADR-028: eccentric arrival only for Pluto. Ceres uses a circular a (e≈0.08 breaks Lambert porkchop convergence across the grid). */
    ...(id === 'pluto' ? { e: p.e } : {}),
  };
}

function buildKboDestination(id: 'arrokoth'): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
    /** Arrokoth's e≈0.041 is below the Lambert convergence breakage
     *  threshold (Bennu at 0.20 is where eccentric arrival kicks in),
     *  so the circular model is fine. Listed separately from the
     *  dwarf / asteroid builders to keep the KBO category visible in
     *  the source — there will likely be more KBOs added later. */
  };
}

function buildCometDestination(id: 'halley' | '67p'): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
    /** Halley (e=0.967) and 67P (e=0.64) are highly eccentric. For
     *  /fly's flyby-cinema purpose we only need their heliocentric
     *  position at the flyby moment (1986-03-14 for Halley, 2014-08-06
     *  for 67P rendezvous), which the circular model approximates
     *  well enough since data designers tune trajectory.json to land
     *  the spacecraft at the same spot. Lambert porkchop grids for
     *  these aren't shipped (no /plan entries), so the eccentric-
     *  convergence concern doesn't apply. */
  };
}

function buildAsteroidDestination(id: 'vesta' | 'psyche' | 'bennu'): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
    /** Bennu's e≈0.20 matches Pluto's regime so it gets eccentric arrival;
     *  Vesta + Psyche stay circular (same Ceres-style approximation —
     *  their e≈0.09 / 0.13 break Lambert convergence across the grid). */
    ...(id === 'bennu' ? { e: p.e } : {}),
  };
}

type SmallBodyDestId =
  | 'itokawa'
  | 'didymos'
  | 'dimorphos'
  | 'donaldjohanson'
  | 'eurybates'
  | 'polymele'
  | 'leucus'
  | 'orus'
  | 'patroclus'
  | 'menoetius';

/** Builder for #341 Batch 5 small-body destinations (Itokawa, the
 *  Didymos-Dimorphos binary, Lucy's Trojan itinerary). All use the
 *  circular-arrival approximation; eccentric Lambert porkchops aren't
 *  shipped for any of these (no /plan grids). The data layer's
 *  trajectory.json places the spacecraft at the iconic moment; this
 *  builder only needs to feed destinationPos() the right heliocentric
 *  position so the destinationMesh co-locates with the ship glyph. */
function buildSmallBodyDestination(id: SmallBodyDestId): DestinationConstants {
  const p = smallBody(id);
  return {
    id,
    a: p.a,
    a0: p.L0,
    meanMotionRadPerDay: (2 * Math.PI) / p.T,
    varpi: p.varpi,
    /** Dimorphos + Didymos at e≈0.38, Donaldjohanson at e≈0.19,
     *  Itokawa at e≈0.28 — above Bennu's 0.20 threshold so the
     *  eccentric model applies. Trojans (Eurybates/Polymele/Leucus/
     *  Orus/Patroclus/Menoetius) all sit at e≈0.03–0.14, comfortably
     *  in the circular regime. */
    ...(p.e > 0.18 ? { e: p.e } : {}),
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
  vesta: buildAsteroidDestination('vesta'),
  psyche: buildAsteroidDestination('psyche'),
  bennu: buildAsteroidDestination('bennu'),
  arrokoth: buildKboDestination('arrokoth'),
  halley: buildCometDestination('halley'),
  '67p': buildCometDestination('67p'),
  itokawa: buildSmallBodyDestination('itokawa'),
  didymos: buildSmallBodyDestination('didymos'),
  dimorphos: buildSmallBodyDestination('dimorphos'),
  donaldjohanson: buildSmallBodyDestination('donaldjohanson'),
  eurybates: buildSmallBodyDestination('eurybates'),
  polymele: buildSmallBodyDestination('polymele'),
  leucus: buildSmallBodyDestination('leucus'),
  orus: buildSmallBodyDestination('orus'),
  patroclus: buildSmallBodyDestination('patroclus'),
  menoetius: buildSmallBodyDestination('menoetius'),
};
