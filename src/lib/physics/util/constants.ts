/**
 * Canonical physical constants — the ONE home (D10, S2a · RFC-037 A01.1).
 *
 * S1's holistic review found `MU_SUN` defined 3× in DIFFERENT units (4π² AU³/yr²
 * vs a km-family value) and re-derived locally in mission-arc — a silent
 * wrong-number hazard if any copy drifts. The fix is one home + the unit IN THE
 * NAME (so same-name-different-unit cannot recur) + a cross-unit agreement test
 * (`constants.test.ts`) that proves every representation is consistent.
 *
 * Per-body surface data (gravity, escape velocity, kinematics) already has a home
 * in `planet-stats.ts`; mechanics (S2b) consumes it there — not duplicated here.
 */

// ─── Conversions ────────────────────────────────────────────────────────────
export const AU_TO_KM = 149_597_870.7;
export const SEC_PER_JULIAN_YEAR = 365.25 * 86_400; // 31_557_600
/** AU/yr → km/s (= AU_TO_KM / SEC_PER_JULIAN_YEAR). */
export const AUPYR_TO_KMS = 4.7404;

// ─── Gravitational parameters (µ = GM) — unit IN THE NAME ────────────────────
/** Heliocentric µ in Gaussian units (Kepler's third law: 4π² AU³/yr²). */
export const MU_SUN_AU3_YR2 = 4 * Math.PI ** 2;
/** Heliocentric µ, IAU (km³/s²). */
export const MU_SUN_KM3_S2 = 1.327_124_400_18e11;
/** Geocentric µ, EGM96 (m³/s²). */
export const MU_EARTH_M3_S2 = 3.986_004_418e14;
/** Geocentric µ, EGM96 (km³/s²) = MU_EARTH_M3_S2 / 1e9. */
export const MU_EARTH_KM3_S2 = 398_600.4418;
/** Selenocentric µ (km³/s²). */
export const MU_MOON_KM3_S2 = 4902.8;

// ─── Earth geometry + standard gravity ───────────────────────────────────────
export const R_EARTH_M = 6_371_000; // IUGG mean (volumetric) radius
/** Earth mean radius (km) = R_EARTH_M / 1000. */
export const R_EARTH_KM = 6371;
/** Standard gravity g₀ (m/s²) — the reference for Isp and Earth-relative weights. */
export const G0 = 9.80665;

// ─── Moon geometry + orbit (M2 · "reach the Moon") ───────────────────────────
/** Moon mean radius (km). */
export const R_MOON_KM = 1737.4;
/** Moon mean orbital radius / semi-major axis about Earth (km). */
export const MOON_ORBIT_RADIUS_KM = 384_400;
