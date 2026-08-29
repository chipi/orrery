/**
 * Physical constants for the Earth→(giant-moon) multi-leg transfer model
 * (ADR-086). A mission to a planetary moon is a patched-conic chain:
 *
 *   1. Heliocentric Earth → host planet (the existing porkchop leg, µ_Sun).
 *   2. Arrive at the host with a hyperbolic v∞, fall down the host's gravity
 *      well to the moon's orbital radius, and insert into a low moon orbit
 *      (µ_host then µ_moon).
 *
 * The moon's orbital radius is NOT hard-coded — it is derived from its sidereal
 * period (the value the 3D scene already ships in `explore-scene.ts`) via
 * Kepler's third law with the host µ, so there is a single source of truth for
 * "where the moon is" and this table can't silently drift from the renderer.
 * (Spike check: every derived radius matches the JPL value to ≤0.05%.)
 *
 * µ values (km³/s²): host planets + moons, JPL/NASA reference. Moon mean radii
 * (km): NASA fact sheets. Low-orbit altitude: 100 km above the mean radius.
 */

/** Host-planet gravitational parameters (km³/s²). */
export const MU_HOST = {
  mars: 42_828.4,
  jupiter: 126_686_534,
  saturn: 37_931_207,
  neptune: 6_835_100,
} as const;

export type HostId = keyof typeof MU_HOST;

export interface MoonParams {
  /** Moon id (matches the /plan destination + explore-scene satellite id). */
  id: string;
  /** Host planet — selects µ_host and the heliocentric leg's destination grid. */
  host: HostId;
  /** Sidereal period around the host (days). Source of truth = explore-scene.ts. */
  periodDays: number;
  /** Moon gravitational parameter (km³/s²). */
  muMoon: number;
  /** Moon mean radius (km) — the low-orbit insertion radius is this + 100 km. */
  radiusKm: number;
}

/**
 * The nine moons #308 covers: Jupiter's Galileans, Saturn's Titan + Enceladus,
 * Neptune's Triton, and Mars' Phobos + Deimos. Periods mirror `explore-scene.ts`
 * (Triton's is |retrograde period|). µ + radii from JPL/NASA fact sheets.
 */
export const MOONS: MoonParams[] = [
  { id: 'phobos', host: 'mars', periodDays: 0.3189, muMoon: 7.11e-4, radiusKm: 11.27 },
  { id: 'deimos', host: 'mars', periodDays: 1.263, muMoon: 9.8e-5, radiusKm: 6.2 },
  { id: 'io', host: 'jupiter', periodDays: 1.769, muMoon: 5959.9, radiusKm: 1821.6 },
  { id: 'europa', host: 'jupiter', periodDays: 3.551, muMoon: 3202.7, radiusKm: 1560.8 },
  { id: 'ganymede', host: 'jupiter', periodDays: 7.155, muMoon: 9887.8, radiusKm: 2634.1 },
  { id: 'callisto', host: 'jupiter', periodDays: 16.689, muMoon: 7179.3, radiusKm: 2410.3 },
  { id: 'titan', host: 'saturn', periodDays: 15.945, muMoon: 8978.1, radiusKm: 2574.7 },
  { id: 'enceladus', host: 'saturn', periodDays: 1.37, muMoon: 7.21, radiusKm: 252.1 },
  { id: 'triton', host: 'neptune', periodDays: 5.877, muMoon: 1427.6, radiusKm: 1353.4 },
];

/** Low circular moon-orbit radius (km) — mean radius + 100 km. */
export function lowOrbitRadiusKm(m: MoonParams): number {
  return m.radiusKm + 100;
}

/**
 * Moon's orbital semi-major axis around its host (km), from Kepler's third law:
 * a³ = µ_host · T² / (4π²). Single source of truth = the sidereal period.
 */
export function moonOrbitRadiusKm(m: MoonParams): number {
  const tSec = m.periodDays * 86_400;
  return Math.cbrt((MU_HOST[m.host] * tSec * tSec) / (4 * Math.PI * Math.PI));
}
