// Normalize a raw HYG catalogue row into the compact star record the
// /explore v2 point-field consumes. Pure + deterministic so the build script
// (scripts/build-universe-stars.ts) and its tests share one source of truth.
//
// The HYG database already provides equatorial cartesian coordinates (x, y, z)
// in parsecs, so we use them directly rather than re-deriving from ra/dec/dist.

/** Fields we read off a parsed HYG row; everything else is ignored. */
export interface RawHygStar {
  /** Catalogue id. 0 is the Sun. */
  id: number;
  /** Distance from Sol in parsecs. 100000 is HYG's "unknown parallax" sentinel. */
  distPc: number;
  /** Apparent visual magnitude. */
  mag: number;
  /** Johnson B−V color index, or null when the catalogue leaves it blank. */
  ci: number | null;
  /** Equatorial cartesian position in parsecs (HYG x/y/z columns). */
  x: number;
  y: number;
  z: number;
}

/** Compact normalized star: position (pc), apparent magnitude, B−V. */
export interface NormalizedStar {
  x: number;
  y: number;
  z: number;
  mag: number;
  ci: number;
}

/**
 * B−V assigned to stars whose catalogue entry omits a color index. 0.65 is
 * roughly solar (a neutral yellow-white) — honest as "unknown, shown neutral"
 * rather than inventing a vivid color.
 */
export const DEFAULT_CI = 0.65;

/** HYG's sentinel distance for stars with no usable parallax. */
export const UNKNOWN_DISTANCE_PC = 100000;

/**
 * Convert a raw HYG row to a NormalizedStar, or return null when the row must be
 * dropped: the Sun (id 0, the origin of this context) and stars with no usable
 * distance (non-finite, ≤0, or the unknown-parallax sentinel).
 */
export function normalizeStar(raw: RawHygStar): NormalizedStar | null {
  if (raw.id === 0) return null;
  if (!Number.isFinite(raw.distPc) || raw.distPc <= 0 || raw.distPc >= UNKNOWN_DISTANCE_PC) {
    return null;
  }
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y) || !Number.isFinite(raw.z)) {
    return null;
  }
  if (!Number.isFinite(raw.mag)) return null;

  const ci = raw.ci !== null && Number.isFinite(raw.ci) ? raw.ci : DEFAULT_CI;
  return { x: raw.x, y: raw.y, z: raw.z, mag: raw.mag, ci };
}
