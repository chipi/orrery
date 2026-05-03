/**
 * Mission Arc geometry — free-return Mars flyby (ADR-009) via two
 * Keplerian half-ellipses (ADR-010). Pure functions only; the /fly
 * route consumes them and renders into Three.js / Canvas 2D.
 *
 * Coordinate system: heliocentric, ecliptic plane (Y=0 in 3D), x/z
 * spans the orbital plane. Distances in AU. Angles in radians, CCW
 * positive. Time in days from epoch.
 *
 * Constants (μ, Earth/Mars a, T, L0) are sourced from
 * static/data/planets.json via the same lambert-grid.constants
 * module the worker uses, so a single source of truth governs every
 * trajectory in the app.
 */

import {
  DESTINATIONS,
  EARTH_A0,
  EARTH_MEAN_MOTION_RAD_PER_DAY,
  MARS_A0,
  MARS_MEAN_MOTION_RAD_PER_DAY,
  R_EARTH_AU,
  R_MARS_AU,
  type DestinationId,
} from './lambert-grid.constants';

/** Mars-specific Hohmann transfer constants — kept as named exports for
 *  back-compat with /fly free-return rendering (ORRERY DEMO scenario). */
export const A_TRANSFER = (R_EARTH_AU + R_MARS_AU) / 2;
export const E_TRANSFER = (R_MARS_AU - R_EARTH_AU) / (R_MARS_AU + R_EARTH_AU);

/** A 2D position in the heliocentric ecliptic plane (AU). */
export type Vec2 = { x: number; z: number };

/** Earth position at simulation day. Circular-orbit approximation. */
export function earthPos(day: number): Vec2 {
  const angle = EARTH_A0 + EARTH_MEAN_MOTION_RAD_PER_DAY * day;
  return { x: Math.cos(angle) * R_EARTH_AU, z: Math.sin(angle) * R_EARTH_AU };
}

/** Mars position at simulation day. Circular-orbit approximation. */
export function marsPos(day: number): Vec2 {
  const angle = MARS_A0 + MARS_MEAN_MOTION_RAD_PER_DAY * day;
  return { x: Math.cos(angle) * R_MARS_AU, z: Math.sin(angle) * R_MARS_AU };
}

/** Heliocentric position of any supported destination on a given
 *  simulation day. v0.1.6 — used by /fly to render outbound arcs to
 *  non-Mars destinations. */
export function destinationPos(day: number, id: DestinationId): Vec2 {
  const d = DESTINATIONS[id];
  const angle = d.a0 + d.meanMotionRadPerDay * day;
  return { x: Math.cos(angle) * d.a, z: Math.sin(angle) * d.a };
}

/**
 * Outbound half-ellipse from Earth (ν=0) to the destination (ν=π).
 * The ellipse's line of apsides is rotated so the start sits at
 * Earth's actual launch position (depPos).
 *
 * Outer destinations (Mars, Jupiter, Saturn): perihelion at Earth
 * (ν=0), aphelion at destination (ν=π). e is the standard positive
 * eccentricity.
 *
 * Inner destinations (Mercury, Venus): the geometry flips — aphelion
 * at Earth (ν=0), perihelion at destination (ν=π). We encode this
 * with a signed eccentricity (negative for inner targets) so the
 * conic equation r = a(1−e²)/(1+e·cos ν) gives r = R_EARTH at ν=0
 * regardless of direction.
 *
 * Defaults to Mars's transfer ellipse for back-compat with the
 * original Mars-only signature.
 *
 * Returns `steps + 1` points sweeping ν: 0 → π.
 */
export function outboundArc(
  depPos: Vec2,
  steps: number,
  destA = R_MARS_AU,
  arrivalVInfKms?: number,
): Vec2[] {
  const depAngle = Math.atan2(depPos.z, depPos.x);
  const a = (R_EARTH_AU + destA) / 2;
  // Signed eccentricity: positive for outer destinations, negative
  // for inner. Both keep ν=0 at Earth, ν=π at destination.
  let eSigned = (destA - R_EARTH_AU) / (destA + R_EARTH_AU);

  // V∞ shaping (v0.1.10 / closes carry-over from v0.1.9 ADR-027). When
  // a real arrival V∞ is supplied (from `mission.flight.arrival
  // .v_infinity_km_s`), bend the arc slightly so two missions to the
  // same dest+dates render visibly distinct trajectories. The bend is
  // a visual approximation, not a true Lambert solution — full
  // re-solve would belong in the Lambert worker.
  if (arrivalVInfKms != null && arrivalVInfKms > 0) {
    // Compute the Hohmann-baseline V∞ for the destination via vis-viva.
    // µ_Sun = 4π² in AU³/yr²; AU/yr → km/s = 4.7404 (IAU 2012).
    const MU_SUN_AU3_YR2 = 4 * Math.PI * Math.PI;
    const AUPYR_TO_KMS = 4.7404;
    const vTransferArrival = Math.sqrt(MU_SUN_AU3_YR2 * (2 / destA - 1 / a)) * AUPYR_TO_KMS;
    const vDestCircular = Math.sqrt(MU_SUN_AU3_YR2 / destA) * AUPYR_TO_KMS;
    const hohmannVInfKms = Math.abs(vTransferArrival - vDestCircular);
    if (hohmannVInfKms > 0.1) {
      const ratio = arrivalVInfKms / hohmannVInfKms;
      // Clamp the bend so a 3× V∞ doesn't render an unphysical loop.
      const bend = Math.max(-0.4, Math.min(0.6, ratio - 1));
      eSigned += Math.sign(eSigned || 1) * bend * 0.12;
    }
  }

  const eSqr = eSigned * eSigned;
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = (Math.PI * i) / steps;
    const r = (a * (1 - eSqr)) / (1 + eSigned * Math.cos(nu));
    const xl = r * Math.cos(nu);
    const zl = r * Math.sin(nu);
    pts.push({
      x: xl * Math.cos(depAngle) - zl * Math.sin(depAngle),
      z: xl * Math.sin(depAngle) + zl * Math.cos(depAngle),
    });
  }
  return pts;
}

/**
 * Return arc — parametric sweep from Mars flyby to Earth arrival.
 * Per ADR-009 + the P03 prototype's implementation, this takes the
 * LONG CCW path (≈321.5°) so the spacecraft loops around most of the
 * Sun rather than cutting across, matching the actual free-return
 * geometry.
 *
 * Radius follows a cosine profile: R_MARS at start → A_TRANSFER at
 * midpoint → R_EARTH at end. Not strictly Keplerian (the true
 * solution involves a second ellipse with shifted perihelion), but
 * visually correct for the educational view at the prototype's level
 * of fidelity.
 */
export function returnArc(marsArr: Vec2, earthRet: Vec2, steps: number): Vec2[] {
  const marsAngle = Math.atan2(marsArr.z, marsArr.x);
  const earthAngle = Math.atan2(earthRet.z, earthRet.x);
  let sweep = earthAngle - marsAngle;
  if (sweep > 0) sweep -= 2 * Math.PI;
  const longSweep = 2 * Math.PI + sweep;

  const pts: Vec2[] = [];
  const radiusSwing = (R_MARS_AU - R_EARTH_AU) / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = marsAngle + longSweep * t;
    const r = A_TRANSFER + radiusSwing * Math.cos(Math.PI * t);
    pts.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r });
  }
  return pts;
}

/**
 * Spacecraft heliocentric position at the given simulation day, given
 * the mission timeline. Linearly interpolates between adjacent
 * waypoints on whichever arc we're currently on (out vs return) so
 * the spacecraft glides smoothly along the rendered curve instead of
 * snapping to one waypoint at a time. Endpoints (depDay, arrDay)
 * still resolve to exact waypoint values, preserving the trajectory-
 * soundness invariants that depend on `pos === out[0]` at depDay.
 */
export interface MissionTimeline {
  dep_day: number;
  flyby_day: number;
  arr_day: number;
}

function lerpPoint(arc: Vec2[], t: number): Vec2 {
  const last = arc.length - 1;
  const f = Math.max(0, Math.min(1, t)) * last;
  const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
  const frac = f - i;
  const a = arc[i];
  const b = arc[i + 1];
  return { x: a.x + (b.x - a.x) * frac, z: a.z + (b.z - a.z) * frac };
}

export function spacecraftPos(
  day: number,
  timeline: MissionTimeline,
  out: Vec2[],
  ret: Vec2[],
): { pos: Vec2; phase: 'pre-launch' | 'outbound' | 'return' | 'arrived'; progress: number } {
  if (day <= timeline.dep_day) {
    return { pos: out[0], phase: 'pre-launch', progress: 0 };
  }
  if (day <= timeline.flyby_day) {
    const t = (day - timeline.dep_day) / (timeline.flyby_day - timeline.dep_day);
    return { pos: lerpPoint(out, t), phase: 'outbound', progress: t * 0.5 };
  }
  if (day <= timeline.arr_day) {
    const t = (day - timeline.flyby_day) / (timeline.arr_day - timeline.flyby_day);
    return { pos: lerpPoint(ret, t), phase: 'return', progress: 0.5 + t * 0.5 };
  }
  return { pos: ret[ret.length - 1], phase: 'arrived', progress: 1 };
}

/**
 * Heading of the spacecraft along its current path — used to orient
 * the rocket icon in 3D and the chevron in 2D. Returns the unit
 * direction vector pointing forward.
 */
export function spacecraftHeading(
  day: number,
  timeline: MissionTimeline,
  out: Vec2[],
  ret: Vec2[],
): Vec2 {
  const { phase } = spacecraftPos(day, timeline, out, ret);
  if (phase === 'pre-launch') return tangent(out, 0);
  if (phase === 'outbound') {
    const t = (day - timeline.dep_day) / (timeline.flyby_day - timeline.dep_day);
    const i = Math.min(out.length - 2, Math.floor(t * (out.length - 1)));
    return tangent(out, i);
  }
  if (phase === 'return') {
    const t = (day - timeline.flyby_day) / (timeline.arr_day - timeline.flyby_day);
    const i = Math.min(ret.length - 2, Math.floor(t * (ret.length - 1)));
    return tangent(ret, i);
  }
  return tangent(ret, ret.length - 2);
}

function tangent(arc: Vec2[], i: number): Vec2 {
  const a = arc[i];
  const b = arc[Math.min(i + 1, arc.length - 1)];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const mag = Math.hypot(dx, dz) || 1;
  return { x: dx / mag, z: dz / mag };
}
