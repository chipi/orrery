/**
 * Earth→(planetary moon) multi-leg transfer ∆v (ADR-086). A mission to a moon
 * of a giant planet (or Mars) is a patched-conic chain, and this returns the
 * two impulses the /plan porkchop shades a cell by:
 *
 *   • **departure** — the heliocentric Earth→host-planet transfer's departure
 *     ∆v (µ_Sun), identical to the existing interplanetary porkchop's departure
 *     term. The spacecraft is NOT captured at the host — its hyperbolic arrival
 *     v∞ is carried straight into the moon leg (no separate host-capture burn).
 *   • **moi** — the moon-orbit insertion. Fall down the host's gravity well from
 *     the interplanetary arrival v∞ to the moon's orbital radius, take the excess
 *     relative to the moon (tangential approximation), then capture into a low
 *     circular moon orbit (µ_moon).
 *
 * A 2D two-body teaching estimate, the giant-planet analogue of the geocentric
 * Earth→Moon model (ADR-085) — same honesty bar: it ships only if the numbers
 * match reality (Europa direct-EOI ~5 km/s, Galileo Europa flyby v∞ ~6 km/s).
 * Real missions use gravity-assist tours to slash the moon leg; the direct
 * patched-conic here is the honest *upper* bound, and the caption says so.
 */

import { solveLambert } from './lambert';
import { DV_FAILED } from './lambert-grid';
import {
  EARTH_A0,
  EARTH_MEAN_MOTION_RAD_PER_DAY,
  MU_SUN,
  R_EARTH_AU,
} from './lambert-grid.constants';
import {
  MU_HOST,
  lowOrbitRadiusKm,
  moonOrbitRadiusKm,
  type MoonParams,
} from './moon-transfer.constants';

const V_EARTH_CIRC = Math.sqrt(MU_SUN / R_EARTH_AU);
const AU_PER_YR_TO_KMS = 4.7404;

/** Heliocentric elements of the host planet (same shape the porkchop grid uses). */
export interface HostElements {
  a: number;
  a0: number;
  meanMotionRadPerDay: number;
  e?: number;
}

export interface MoonMissionDv {
  /** Heliocentric Earth→host departure ∆v, km/s. */
  departure: number;
  /** Moon-orbit insertion ∆v, km/s. */
  moi: number;
  /** departure + moi — the value the porkchop cell is shaded by, km/s. */
  total: number;
  /** Arrival v∞ at the host planet, km/s (diagnostic / honesty checks). */
  vInfHost: number;
  /** False when the heliocentric leg has no feasible Lambert solution. */
  feasible: boolean;
}

const INFEASIBLE: MoonMissionDv = {
  departure: DV_FAILED,
  moi: 0,
  total: DV_FAILED,
  vInfHost: 0,
  feasible: false,
};

/** Host heliocentric position (AU), matching `lambert-grid.destinationHelioXY`. */
function hostHelioXY(day: number, host: HostElements): [number, number] {
  const e = host.e ?? 0;
  const nu = host.a0 + host.meanMotionRadPerDay * day;
  const r = (host.a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return [r * Math.cos(nu), r * Math.sin(nu)];
}

/**
 * Multi-leg ∆v for an Earth→moon mission cell. `depDay`/`arrDay` index the
 * heliocentric Earth→host leg (days from epoch), `tofYr` its time of flight
 * (years); `host` are the host planet's heliocentric elements; `moon` its params.
 */
export function interplanetaryMoonDv(
  depDay: number,
  arrDay: number,
  tofYr: number,
  host: HostElements,
  moon: MoonParams,
): MoonMissionDv {
  // ── Leg 1: heliocentric Earth → host planet ──
  const tE = EARTH_A0 + EARTH_MEAN_MOTION_RAD_PER_DAY * depDay;
  const r1: [number, number] = [R_EARTH_AU * Math.cos(tE), R_EARTH_AU * Math.sin(tE)];
  const r2 = hostHelioXY(arrDay, host);
  const r2mag = Math.hypot(r2[0], r2[1]);
  const vDest = Math.sqrt(MU_SUN * (2 / r2mag - 1 / host.a));

  const result = solveLambert(r1, r2, tofYr, MU_SUN);
  if (!result) return INFEASIBLE;

  const departure = Math.abs(result.v1 - V_EARTH_CIRC) * AU_PER_YR_TO_KMS;
  // Hyperbolic excess w.r.t. the host — carried into the moon leg, not captured.
  const vInfHost = Math.abs(vDest - result.v2) * AU_PER_YR_TO_KMS;

  // ── Leg 2: host well → moon-orbit insertion (patched-conic) ──
  const muHost = MU_HOST[moon.host];
  const aMoon = moonOrbitRadiusKm(moon);
  const vMoonCirc = Math.sqrt(muHost / aMoon); // moon's circular speed around host
  const vAtMoon = Math.sqrt(vInfHost * vInfHost + (2 * muHost) / aMoon); // speed at the moon's radius
  const vInfMoon = Math.abs(vAtMoon - vMoonCirc); // excess relative to the moon (tangential)
  const rLo = lowOrbitRadiusKm(moon);
  const moi =
    Math.sqrt(vInfMoon * vInfMoon + (2 * moon.muMoon) / rLo) - Math.sqrt(moon.muMoon / rLo);

  const total = departure + moi;
  if (!isFinite(total)) return INFEASIBLE;
  return { departure, moi, total, vInfHost, feasible: true };
}
