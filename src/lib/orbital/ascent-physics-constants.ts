/**
 * Physics + unit constants for the powered-ascent engine
 * (RFC-034 · epic #412 · Scene 0). Split out of ascent-physics.ts so
 * the unit tests + validation harness import canonical values instead
 * of re-typing them, mirroring fly-physics-constants.ts.
 *
 * The ascent engine works in SI internally (metres, seconds, kilograms,
 * newtons, pascals); readouts are converted to km / km·s⁻¹ at the
 * summary boundary.
 *
 * Sources:
 *   - G0: CGPM 1901 standard gravity (defines Isp)
 *   - MU_EARTH: EGM96 / IAU geodetic constant
 *   - R_EARTH_M: IUGG mean (volumetric) radius
 *   - Sea-level pressure/density + scale height: US Standard Atmosphere 1976
 */

/** Standard gravity (m·s⁻²) — the g₀ in Isp·g₀, NOT local gravity. */
export const G0 = 9.80665;

/** Earth gravitational parameter (m³·s⁻²) — EGM96. */
export const MU_EARTH_M3_S2 = 3.986004418e14;

/** Earth mean radius (m) — IUGG volumetric mean. */
export const R_EARTH_M = 6_371_000;

/** Sea-level atmospheric pressure (Pa) — US Std Atmosphere 1976. */
export const SEA_LEVEL_PRESSURE_PA = 101_325;

/** Sea-level air density (kg·m⁻³) — US Std Atmosphere 1976. */
export const SEA_LEVEL_DENSITY_KGM3 = 1.225;

/**
 * Atmospheric scale height (m). A single-exponential isothermal model
 * ρ(h) = ρ₀·exp(−h/H) is used for S1 — accurate enough for dynamic
 * pressure (Max-Q) and drag-loss bookkeeping through the troposphere/
 * stratosphere where the vehicle spends its aerodynamic phase. A
 * piecewise US-Std-1976 table is a later refinement (RFC-034 §10).
 */
export const ATM_SCALE_HEIGHT_M = 8_500;

/**
 * Karman-line altitude (m) — nominal edge of the atmosphere. Above it
 * drag is negligible and thrust runs at vacuum Isp; used as the default
 * fairing-jettison cue when a profile omits one.
 */
export const KARMAN_LINE_M = 100_000;

/** Reference low-Earth-orbit altitude (m) for the "reached orbit" gate. */
export const LEO_REF_ALT_M = 200_000;

/** Newtons per kilonewton — profiles quote thrust in kN. */
export const N_PER_KN = 1_000;
