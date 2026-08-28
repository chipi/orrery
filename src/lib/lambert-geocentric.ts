/**
 * Earth→Moon geocentric transfer ∆v (ADR-085). The heliocentric sibling is
 * `computeDv` in `lambert-grid.ts`; this is the μ_Earth / patched-conic-LOI
 * path for the Moon. Pure functions — unit-tested against Apollo TLI/LOI
 * bands, precomputed into `earth-to-moon.json`, and dispatched by the grid
 * driver on `kind: 'geo'`.
 */

import { solveLambert } from './lambert';
import { DV_FAILED } from './lambert-grid';
import {
  AMAX_GEO,
  EPOCH_JD,
  MU_EARTH,
  MU_MOON,
  R_LLO,
  R_LEO,
  V_LEO_CIRC,
  V_LLO_CIRC,
  moonEclipticXYKm,
  moonSpeedKmS,
} from './lambert-geocentric-grid.constants';

export interface GeoTransfer {
  /** Trans-lunar injection ∆v from the circular LEO parking orbit, km/s. */
  tli: number;
  /** Lunar-orbit-insertion ∆v into the circular low-lunar orbit, km/s (patched-conic). */
  loi: number;
  /** TLI + LOI, km/s — the value the porkchop cell is shaded by. */
  total: number;
  /** False when the short-way Lambert has no feasible solution for this cell. */
  feasible: boolean;
}

/** Infeasible-cell sentinel (shared with the heliocentric grid's colour scale). */
const INFEASIBLE: GeoTransfer = { tli: DV_FAILED, loi: 0, total: DV_FAILED, feasible: false };

/**
 * Geocentric Earth→Moon transfer ∆v for a `(departure day, time-of-flight)`
 * cell. Departure and TOF are in **days** from the grid epoch; all internal
 * physics is km / seconds (ADR-085 D2/D5).
 *
 * - r2 = Moon ecliptic position at arrival (km); r1 = LEO radius antipodal to
 *   r2 (perigee-opposite-apogee — exact perigee at the min-∆v cell).
 * - TLI = geocentric transfer speed at LEO − circular LEO speed.
 * - LOI = patched-conic insertion: v∞ (transfer speed at the Moon vs the
 *   Moon's own speed, scalar/tangential — the same approximation the
 *   heliocentric arrival ∆v uses) → hyperbolic-to-circular capture.
 */
export function geoTransferDv(depDay: number, tofDay: number): GeoTransfer {
  const jdArr = EPOCH_JD + depDay + tofDay;
  const r2 = moonEclipticXYKm(jdArr);
  const r2mag = Math.hypot(r2[0], r2[1]);
  if (r2mag <= 0) return INFEASIBLE;

  // r1: LEO radius, antipodal to the arrival direction (ADR-085 D2).
  const r1: [number, number] = [(-r2[0] / r2mag) * R_LEO, (-r2[1] / r2mag) * R_LEO];

  const tofSec = tofDay * 86_400;
  const res = solveLambert(r1, r2, tofSec, MU_EARTH, AMAX_GEO);
  if (!res) return INFEASIBLE;

  // TLI — both speeds geocentric.
  const tli = Math.abs(res.v1 - V_LEO_CIRC);

  // LOI — patched-conic at the Moon (Fable-5 B1): v∞ relative to the Moon,
  // then hyperbolic-excess → circular-capture burn. Scalar v∞ mirrors the
  // heliocentric arrival-∆v convention (exact at the tangential min-∆v cell).
  const vMoon = moonSpeedKmS(jdArr);
  const vInf = Math.abs(res.v2 - vMoon);
  const loi = Math.sqrt(vInf * vInf + (2 * MU_MOON) / R_LLO) - V_LLO_CIRC;

  const total = tli + loi;
  if (!isFinite(total)) return INFEASIBLE;
  return { tli, loi, total, feasible: true };
}
