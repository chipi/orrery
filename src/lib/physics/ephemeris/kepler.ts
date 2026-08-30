// Pure Keplerian orbit math for exoplanet BodyScenes (/explore v2 Slice 2).
//
// Real orbital elements (semi-major axis, eccentricity, period) → position over
// time, with the host star at a focus of the ellipse. The orbital *phase* is
// illustrative — the NASA Exoplanet Archive does not carry a reliable periastron
// epoch for every planet, so we spread starting phases deterministically; the
// orbit shapes and periods are real. This module is pure (no THREE); the WebGL
// BodyScene builder consumes it.

const TAU = Math.PI * 2;
const DAYS_PER_YEAR = 365.25;

/** Wrap an angle into [0, 2π). */
export function normalizeAngle(a: number): number {
  const r = a % TAU;
  return r < 0 ? r + TAU : r;
}

/**
 * Solve Kepler's equation `M = E − e·sin E` for the eccentric anomaly E via
 * Newton–Raphson. Converges in a handful of iterations for all bound orbits
 * (0 ≤ e < 1).
 */
export function eccentricAnomaly(M: number, e: number, tol = 1e-10, maxIter = 30): number {
  const m = normalizeAngle(M);
  let E = e < 0.8 ? m : Math.PI; // seed: M for low-e, π for high-e
  for (let i = 0; i < maxIter; i++) {
    const dE = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

/**
 * Position on the orbit in the orbital plane, focus (star) at the origin, in the
 * same length units as `a`. `M` is the mean anomaly (radians).
 */
export function orbitalPlanePosition(a: number, e: number, M: number): { x: number; y: number } {
  const E = eccentricAnomaly(M, e);
  const b = a * Math.sqrt(1 - e * e);
  return { x: a * (Math.cos(E) - e), y: b * Math.sin(E) };
}

/**
 * Mean anomaly at time `t` (years), for a planet of the given period (days) and
 * a starting phase offset (radians).
 */
export function meanAnomaly(tYears: number, periodDays: number, phase0 = 0): number {
  const periodYears = periodDays / DAYS_PER_YEAR;
  return phase0 + (TAU * tYears) / periodYears;
}

/**
 * A deterministic starting phase (radians) for the planet at `index` of `count`,
 * so a system's planets don't all line up at periastron. Spread evenly with a
 * small golden-angle jitter for organic-looking configurations.
 */
export function phaseForIndex(index: number, count: number): number {
  const even = count > 0 ? (index / count) * TAU : 0;
  return normalizeAngle(even + index * 2.399963); // golden angle (rad)
}

/**
 * Sample `segments` points around the full ellipse (focus at origin) for drawing
 * the orbit line. Uniform in eccentric anomaly for smooth spacing.
 */
export function sampleEllipse(a: number, e: number, segments = 128): Array<[number, number]> {
  const b = a * Math.sqrt(1 - e * e);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * TAU;
    pts.push([a * (Math.cos(E) - e), b * Math.sin(E)]);
  }
  return pts;
}
