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
import { eccentricAnomaly } from './universe/kepler';
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

/** Host heliocentric position (AU), matching `lambert-grid.destinationHelioXY`.
 *  `a0 + n·day` is the mean longitude L; on an eccentric orbit perihelion sits
 *  at ϖ (`varpi`), not longitude 0 (S2) — phase via M = L − ϖ → Kepler → true
 *  anomaly at longitude ν + ϖ. Circular hosts (e=0) reduce to [a·cos L, a·sin L],
 *  byte-identical to the pre-ϖ model (the giant-planet hosts are all circular). */
function hostHelioXY(day: number, host: HostElements): [number, number] {
  const e = host.e ?? 0;
  const L = host.a0 + host.meanMotionRadPerDay * day;
  if (e === 0) return [host.a * Math.cos(L), host.a * Math.sin(L)];
  const varpi = host.varpi ?? 0;
  const E = eccentricAnomaly(L - varpi, e);
  const r = host.a * (1 - e * Math.cos(E));
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  const theta = nu + varpi;
  return [r * Math.cos(theta), r * Math.sin(theta)];
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
  // VECTOR hyperbolic excess w.r.t. the host — carried into the moon leg, not
  // captured (B1). A scalar |vDest − v2| collapses on fast (faster-than-Hohmann)
  // transfers, where the speeds match but the velocity VECTORS diverge (large
  // radial component) — the exact bug ADR-085 §D2 fixed for the Moon, and it
  // bites hardest here because v∞ is squared into the well-drop. Split the
  // arrival velocity into tangential √(µp)/r2 + radial; the host moves ~tangentially.
  const vt2 = Math.sqrt(MU_SUN * result.p) / r2mag;
  const vr2 = Math.sqrt(Math.max(0, result.v2 * result.v2 - vt2 * vt2));
  const vInfHost = Math.hypot(vr2, vt2 - vDest) * AU_PER_YR_TO_KMS;

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
