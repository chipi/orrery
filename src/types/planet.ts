export interface PlanetConstants {
  /** Heliocentric gravitational parameter (AU³/yr²; ≈ 4π²) */
  mu_sun: number;
  /** km per AU (IAU 2012) */
  au_to_km: number;
  /** Light-minutes per AU */
  au_to_lmin: number;
  /** km/s per AU/yr */
  aupyr_to_kms: number;
}

export interface Planet {
  /** Planet name, e.g. "Earth". */
  name: string;
  /** Semi-major axis (AU). */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Orbital period (days). */
  T: number;
  /** Mean longitude at J2000 epoch (radians). */
  L0: number;
  /** Inclination to ecliptic (degrees). */
  incl: number;
  /** Axial tilt (degrees). */
  axialTilt: number;
  /** Rotation period (days). Negative for retrograde rotation. */
  rotPeriod: number;
}

export interface PlanetsData {
  constants: PlanetConstants;
  planets: Planet[];
}

/**
 * Editorial overlay per planet per locale (ADR-017). Lives in
 * `static/data/i18n/[locale]/planets/[id].json` where `id` is the
 * lowercase planet name.
 */
export interface PlanetOverlay {
  /** Display name in the user's locale. */
  name: string;
  /** One-line classification (e.g. "Terrestrial planet"). */
  type: string;
  /** Editorial summary surfaced in the OVERVIEW tab. */
  fact: string;
  /** Editorial paragraph surfaced in the TECHNICAL tab. */
  bio: string;
  /** When true, the panel surfaces the "PLAN A MISSION" CTA. */
  missionable?: boolean;
}

/**
 * A planet record merged from `planets.json` (orbital constants, IAU
 * J2000) with its locale overlay (editorial). Returned by `getPlanets`.
 */
export interface LocalizedPlanet extends Planet, PlanetOverlay {
  /** Lowercase identifier used as URL slug & overlay filename. */
  id: string;
}
