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

import { solveLambertPrograde } from '$lib/physics/transfer/lambert';
import { DV_FAILED } from '$lib/physics/transfer/lambert-grid';
import {
  bodyHelioVelXY,
  bodyHelioXY,
  lambertEndVelocities,
} from '$lib/physics/transfer/helio-state';
import {
  EARTH_ORBIT,
  HELIO_GRID_EPOCH_SIM_DAY,
  MU_SUN,
} from '$lib/physics/transfer/lambert-grid.constants';
import {
  MU_HOST,
  lowOrbitRadiusKm,
  moonOrbitRadiusKm,
  type MoonParams,
} from './moon-transfer.constants';

const AU_PER_YR_TO_KMS = 4.7404;

/** Heliocentric elements of the host planet (same shape the porkchop grid uses). */
export interface HostElements {
  a: number;
  a0: number;
  meanMotionRadPerDay: number;
  e?: number;
  /** Longitude of perihelion ϖ (rad); phases the eccentric conic (S2). Inert
   *  for the circular host model (e=0) the giant-planet hosts currently use. */
  varpi?: number;
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
  // Grid days count from 2026-01-01; the elements are at J2000.
  const t1 = depDay + HELIO_GRID_EPOCH_SIM_DAY;
  const t2 = arrDay + HELIO_GRID_EPOCH_SIM_DAY;
  const r1 = bodyHelioXY(t1, EARTH_ORBIT);
  const r2 = bodyHelioXY(t2, host);

  const result = solveLambertPrograde(r1, r2, tofYr, MU_SUN);
  if (!result) return INFEASIBLE;
  const ends = lambertEndVelocities(r1, r2, result.p, MU_SUN);
  if (!ends) return INFEASIBLE;

  // VECTOR hyperbolic excesses (B1): the transfer's velocity (Lagrange f/g) minus Earth's and
  // the host's own velocity on their eccentric orbits. A scalar |vDest − v2| collapses on fast
  // transfers, where the speeds match but the vectors diverge, and v∞ is squared into the
  // well-drop below; "the planet moves tangentially" misses an eccentric host's radial motion.
  const vE = bodyHelioVelXY(t1, EARTH_ORBIT);
  const vH = bodyHelioVelXY(t2, host);
  const departure = Math.hypot(ends.v1[0] - vE[0], ends.v1[1] - vE[1]) * AU_PER_YR_TO_KMS;
  const vInfHost = Math.hypot(ends.v2[0] - vH[0], ends.v2[1] - vH[1]) * AU_PER_YR_TO_KMS;

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
