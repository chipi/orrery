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
  /** Rotation period (days). */
  rotPeriod: number;
}
