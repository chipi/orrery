/**
 * Geocentric (Earth-centred) constants + Moon-ephemeris adapters for the
 * Earth→Moon porkchop (ADR-085). The heliocentric porkchop lives in
 * `lambert-grid.constants.ts`; this is its geocentric sibling — same
 * μ-parameterized `solveLambert`, different central body.
 *
 * Units here are **km, seconds, km/s** (the heliocentric path is AU/yr).
 * Both paths keep their units isolated inside their own `computeDv*` and
 * emit km/s into the grid.
 */

import { geocentricMoon } from './astronomy/moon';

/** km per AU (IAU 2012). Matches `orbital.ts#AU_TO_KM`. */
export const AU_TO_KM = 149_597_870.7;

/** Earth gravitational parameter, km³/s² (EGM). */
export const MU_EARTH = 398_600.4418;
/** Moon gravitational parameter, km³/s² (DE-440). */
export const MU_MOON = 4902.8;

/** LEO parking-orbit radius, km (≈ 200 km altitude above R⊕ 6378 km). */
export const R_LEO = 6578;
/** Low-lunar-orbit radius, km (≈ 100 km altitude above R☾ 1737 km). */
export const R_LLO = 1837;

/** Circular speed in the LEO parking orbit, km/s (≈ 7.784). */
export const V_LEO_CIRC = Math.sqrt(MU_EARTH / R_LEO);
/** Circular speed in the low-lunar orbit, km/s (≈ 1.634). */
export const V_LLO_CIRC = Math.sqrt(MU_MOON / R_LLO);

/**
 * Bisection ceiling on the transfer semi-major axis (km) for `solveLambert`.
 * An Earth–Moon transfer needs a ≈ 1.8–3.5×10⁵ km; 2×10⁶ km clears the whole
 * feasible band with margin. (The heliocentric default is AU-scale — see
 * ADR-085 D5 / the `aMax` param on `solveLambert`.)
 */
export const AMAX_GEO = 2_000_000;

/**
 * Julian Day at grid epoch (depDay = 0) = **2026-01-01 00:00 UTC**.
 *
 * This MUST match the display epoch `porkchop.ts#dayToDate` uses (`epochYear
 * 2026`) — the Moon moves ~13°/day, so an epoch offset would put the porkchop's
 * perigee-distance structure out of phase with the departure dates the UI
 * renders (ADR-085 D5; caught in the /plan integration review). JD for the
 * Gregorian calendar date 2026-01-01 00:00 UT.
 */
export const EPOCH_JD = 2_461_041.5;

/** Finite-difference half-step for the Moon velocity, days. */
const V_DIFF_DAYS = 0.02;

/**
 * Moon geocentric position at Julian Day `jd`, projected to the 2D ecliptic
 * plane, in km. Reuses the app's existing `geocentricMoon` (Schlyter/Brown
 * analytic, ~1–2 arcmin); the ≤5.3° inclination it drops via the 2D
 * projection costs ≤0.4% on |r| — negligible for this teaching model, and
 * honest (real missions launch into the transfer plane, so there is no
 * plane-change burn to represent). ADR-085 D2/D3.
 */
export function moonEclipticXYKm(jd: number): [number, number] {
  const { pos } = geocentricMoon(jd);
  return [pos.x * AU_TO_KM, pos.y * AU_TO_KM];
}

/**
 * Moon geocentric speed in the 2D ecliptic plane at `jd`, km/s, by central
 * finite difference of `moonEclipticXYKm`. ≈ 1.02–1.08 km/s. Used for the
 * patched-conic v∞ at the Moon (ADR-085 D2 / Fable-5 B1).
 */
export function moonSpeedKmS(jd: number): number {
  const [xa, ya] = moonEclipticXYKm(jd + V_DIFF_DAYS);
  const [xb, yb] = moonEclipticXYKm(jd - V_DIFF_DAYS);
  const dtSec = 2 * V_DIFF_DAYS * 86_400;
  return Math.hypot(xa - xb, ya - yb) / dtSec;
}
