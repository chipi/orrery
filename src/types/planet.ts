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
