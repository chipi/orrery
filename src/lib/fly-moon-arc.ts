import {
  earthPos,
  marsPos,
  destinationPos,
  transferEllipse,
  returnArc,
  type MissionTimeline,
  type Vec2,
} from '$lib/physics/transfer/mission-arc';
import type { DestinationId } from '$lib/physics/transfer/lambert-grid.constants';

/**
 * Pure math for /fly arc + Moon-mode heliocentric helpers.
 *
 * Extracted from src/routes/fly/+page.svelte during W9 (#279) to
 * shrink the route's LOC + unlock per-function unit tests. Nothing
 * here touches Svelte state, the Three.js scene, or the DOM — every
 * function takes its inputs as arguments and returns plain data.
 */

/**
 * Outbound + return arc segment count. 600 is high enough that the
 * linear-interp spacecraft position sits visually on the CatmullRom-
 * splined tube — the chord-vs-spline gap between adjacent waypoints
 * is sub-pixel at this density.
 */
export const ARC_STEPS = 600;

/**
 * Moon's heliocentric visual orbit radius around Earth, in AU. Real
 * is 0.0026 AU (~0.21 scene units at SCALE_3D=80) — too small to see
 * alongside Mars at 80u. Exaggerated to 0.4 AU (~32 scene units) so
 * the cislunar trip occupies roughly the same visual span as
 * Earth→Mars (~40u). Earth's orbit ring (80u) still encloses the
 * Moon, just with more visible breathing room.
 */
export const MOON_FLY_RADIUS_AU = 0.4;

/** Sidereal lunar month — Moon's heliocentric visual orbit period. */
export const MOON_PERIOD_DAYS = 27.32;

/**
 * Heliocentric position of the Moon at `simDay` (live), with the
 * exaggerated MOON_FLY_RADIUS_AU offset around Earth.
 */
export function moonHelioPos(day: number): Vec2 {
  const earth = earthPos(day);
  const angle = ((day % MOON_PERIOD_DAYS) / MOON_PERIOD_DAYS) * Math.PI * 2;
  return {
    x: earth.x + Math.cos(angle) * MOON_FLY_RADIUS_AU,
    z: earth.z + Math.sin(angle) * MOON_FLY_RADIUS_AU,
  };
}

/**
 * Cislunar trajectory in heliocentric AU. Both endpoints are pinned
 * exactly (start at depDay, end at arrDay); intermediate points ride
 * Earth's orbital motion and linearly blend the Earth-relative offset
 * from start-offset to end-offset. For a 4-day Apollo this is a slow
 * drift along Earth's orbit plus a small hop — reads correctly at
 * the heliocentric scale used by the rest of /fly. Symmetric: pass
 * start=Earth + end=Moon for outbound; start=Moon + end=Earth for
 * return.
 */
export function moonHelioArc(
  depDay: number,
  arrDay: number,
  start: Vec2,
  end: Vec2,
  steps: number,
): Vec2[] {
  const startOffX = start.x - earthPos(depDay).x;
  const startOffZ = start.z - earthPos(depDay).z;
  const endOffX = end.x - earthPos(arrDay).x;
  const endOffZ = end.z - earthPos(arrDay).z;
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const earthAtT = earthPos(depDay + t * (arrDay - depDay));
    const offX = startOffX + (endOffX - startOffX) * t;
    const offZ = startOffZ + (endOffZ - startOffZ) * t;
    pts.push({ x: earthAtT.x + offX, z: earthAtT.z + offZ });
  }
  return pts;
}

/**
 * Build outbound + (optional) return arcs for a mission timeline.
 *
 * - Outbound: true two-point Keplerian ellipse with Sun at one focus.
 *   Both endpoints land EXACTLY on live planet positions — Earth at
 *   dep_day, destination at flyby_day (which equals arr_day for
 *   one-way landings, so using flyby_day uniformly keeps the math
 *   the same shape across mission types).
 * - Return arc: only built for free-return; starts at the outbound
 *   terminus (== destination at flyby_day) and ends at live Earth at
 *   arr_day, so re-entry visually meets Earth.
 */
export function buildArcs(
  timeline: MissionTimeline,
  isFreeReturn: boolean,
  destinationId: DestinationId = 'mars',
  arrivalVInfKms?: number | null,
): { out: Vec2[]; ret: Vec2[] } {
  const earthDep = earthPos(timeline.dep_day);
  const destArr =
    destinationId === 'mars'
      ? marsPos(timeline.flyby_day)
      : destinationPos(timeline.flyby_day, destinationId);
  const out = transferEllipse(earthDep, destArr, ARC_STEPS, arrivalVInfKms);
  if (!isFreeReturn) return { out, ret: [] };
  const earthRet = earthPos(timeline.arr_day);
  const ret = returnArc(out[out.length - 1], earthRet, ARC_STEPS);
  return { out, ret };
}
