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
  EARTH_A0,
  EARTH_MEAN_MOTION_RAD_PER_DAY,
  MARS_A0,
  MARS_MEAN_MOTION_RAD_PER_DAY,
  R_EARTH_AU,
  R_MARS_AU,
} from './lambert-grid.constants';

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

/**
 * Outbound half-ellipse from Earth (perihelion, ν=0) to Mars (aphelion, ν=π).
 * The ellipse's perihelion direction is rotated to match the departure
 * angle — i.e., perihelion sits at Earth's actual launch position.
 *
 * Returns `steps + 1` points sweeping ν: 0 → π.
 */
export function outboundArc(depPos: Vec2, steps: number): Vec2[] {
  const depAngle = Math.atan2(depPos.z, depPos.x);
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = (Math.PI * i) / steps;
    const r = (A_TRANSFER * (1 - E_TRANSFER * E_TRANSFER)) / (1 + E_TRANSFER * Math.cos(nu));
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
 * the mission timeline. Linear-interpolated along whichever arc we're
 * currently on (out vs return). The arc's index is rounded to the
 * nearest sample so the trail/heading line up with the rendered
 * geometry.
 */
export interface MissionTimeline {
  dep_day: number;
  flyby_day: number;
  arr_day: number;
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
    const i = Math.min(out.length - 1, Math.floor(t * (out.length - 1)));
    return { pos: out[i], phase: 'outbound', progress: t * 0.5 };
  }
  if (day <= timeline.arr_day) {
    const t = (day - timeline.flyby_day) / (timeline.arr_day - timeline.flyby_day);
    const i = Math.min(ret.length - 1, Math.floor(t * (ret.length - 1)));
    return { pos: ret[i], phase: 'return', progress: 0.5 + t * 0.5 };
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
