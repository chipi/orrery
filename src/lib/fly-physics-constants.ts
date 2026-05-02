/**
 * Physics + unit-conversion constants used by /fly trajectory math
 * (v0.2.0 / ADR-030). Pulled out of `+page.svelte` into a single
 * source of truth so unit tests + validation harness can import the
 * canonical values without re-typing them per call site.
 *
 * Sources:
 *   - MU_SUN, AU_TO_KM: IAU 2012 (matches `static/data/planets.json`)
 *   - AU_PER_YR_TO_KMS: derived from MU_SUN at 1 AU
 *   - C_LIGHT_KM_S: SI 2019
 *   - MOON_ORBITAL_PERIOD_DAYS: sidereal lunar month (NASA fact sheet)
 *   - MOON_VISUAL_DISTANCE: Earth-Moon scene scale (matches /fly Moon-mode)
 */

/** Heliocentric gravitational parameter (AU³/yr²). */
export const MU_SUN_AU3_YR2 = 4 * Math.PI * Math.PI;

/** Astronomical Unit in kilometres (IAU 2012). */
export const AU_TO_KM = 149_597_870.7;

/** Astronomical Unit in light-minutes. */
export const AU_TO_LMIN = 8.317;

/** Convert AU/yr → km/s (IAU 2012). */
export const AU_PER_YR_TO_KMS = 4.7404;

/** Speed of light in km/s (SI 2019). */
export const C_LIGHT_KM_S = 299_792.458;

/** Sidereal lunar month — period of one Moon orbit around Earth (days). */
export const MOON_ORBITAL_PERIOD_DAYS = 27.32;

/** Earth–Moon scene-scale distance for /fly Moon-mode rendering.
 *  Educational compromise per the existing /fly comment: distances
 *  aren't to-scale, but the spacecraft path + timing relative to the
 *  Moon's orbital motion are. */
export const MOON_VISUAL_DISTANCE = 100;

/** Quadratic Bezier control-point offset for the Moon arc (units of
 *  the Moon position vector). Tuned in /fly v0.1.x for the cislunar
 *  view; preserved verbatim here. */
export const MOON_BEZIER_CTRL_OFFSET = 0.18;
