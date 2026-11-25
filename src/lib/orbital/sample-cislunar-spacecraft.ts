/**
 * Linearly interpolate a cislunar trajectory phase's points[] to find
 * the spacecraft position at a given progress fraction, with an
 * optional Moon-local-frame shift for phases that are stored in
 * Moon-centred coordinates.
 *
 * Cislunar phases like 'lunar_orbit' / 'descent' / 'ascent' /
 * 'spiral_lunar' / 'lunar_flyby' are authored in coordinates relative
 * to the Moon at a reference epoch (typically `arcTimeline.flyby_day`).
 * The animate loop walks them in ECI km, so the caller has to add the
 * delta between the Moon's current position and its reference position
 * to translate the sample into ECI. Heliocentric / Earth-orbit phases
 * are stored in ECI directly and skip the shift.
 *
 * Lifted out of /fly's updateAutoZoomTargets so the per-phase sampling
 * is unit-testable.
 */

import type { CislunarPhase } from '$lib/orbital/cislunar/cislunar-geometry';

export interface CislunarSamplePos {
  x: number;
  y: number;
  z: number;
}

/** Phase types whose points[] are stored in Moon-local coordinates. */
export const MOON_LOCAL_PHASE_TYPES = new Set<string>([
  'lunar_orbit',
  'spiral_lunar',
  'lunar_flyby',
  'descent',
  'ascent',
]);

export interface MoonFrameShift {
  /** Current Moon position in ECI km. */
  moonPos: CislunarSamplePos;
  /** Reference Moon position in ECI km — where the points[] author
   *  was when the trajectory was generated. The delta
   *  (moonPos − moonRefPos) translates the Moon-local sample into ECI. */
  moonRefPos: CislunarSamplePos;
}

/** Coasts drawn as Earth-focus conics, uniform in true anomaly (cislunar-geometry.ts). */
const EARTH_FOCUS_COASTS = new Set<string>(['tli_coast', 'tei_coast']);

const sweptAreas = new WeakMap<readonly CislunarSamplePos[], Float64Array>();

/**
 * The fractional point index the craft has reached at `phaseProgress` (0..1 of the phase's time).
 * A phase with point times (a waypoint path) is placed by them. Otherwise an Earth-focus coast is drawn uniform in true anomaly, so its points are not evenly spaced in
 * time: by Kepler's second law the time between two points is proportional to the area the
 * radius sweeps between them, |r_i × r_i+1| / 2. Every other phase is index-linear.
 */
export function phaseIndexAt(phase: CislunarPhase, phaseProgress: number): number {
  const pts = phase.points;
  const last = pts.length - 1;
  const p = Math.max(0, Math.min(1, phaseProgress));
  if (last < 1) return 0;
  const times = phase.point_met_days;
  if (times && times.length === pts.length && times[last] > times[0]) {
    const met = times[0] + p * (times[last] - times[0]);
    return fractionalIndex(times, met);
  }
  if (!EARTH_FOCUS_COASTS.has(phase.type)) return p * last;
  let cum = sweptAreas.get(pts);
  if (!cum) {
    cum = new Float64Array(pts.length);
    for (let i = 1; i <= last; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const cx = a.y * b.z - a.z * b.y;
      const cy = a.z * b.x - a.x * b.z;
      const cz = a.x * b.y - a.y * b.x;
      const area = Math.hypot(cx, cy, cz);
      // A segment through the focus sweeps no area and is not a conic: keep index-linear.
      if (!(area > 0)) {
        cum = new Float64Array(0);
        break;
      }
      cum[i] = cum[i - 1] + area;
    }
    sweptAreas.set(pts, cum);
  }
  if (cum.length === 0) return p * last;
  return fractionalIndex(cum, p * cum[last]);
}

/** Where `v` falls in the non-decreasing `xs`, as a fractional index. */
function fractionalIndex(xs: ArrayLike<number>, v: number): number {
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= v) lo = mid;
    else hi = mid;
  }
  const seg = xs[hi] - xs[lo];
  return lo + (seg > 0 ? Math.max(0, Math.min(1, (v - xs[lo]) / seg)) : 0);
}

/**
 * Sample the spacecraft position at fraction `phaseProgress` ∈ [0, 1]
 * through the active phase. Returns null when the phase has no
 * points (caller treats this as "no position available" and likely
 * skips the camera update).
 *
 * When `frame` is provided AND the phase type is in
 * `MOON_LOCAL_PHASE_TYPES`, the returned sample is translated from
 * Moon-local frame into ECI. Otherwise the raw points[] sample is
 * returned as-is.
 */
export function sampleCislunarSpacecraftPos(
  phase: CislunarPhase,
  phaseProgress: number,
  frame?: MoonFrameShift,
): CislunarSamplePos | null {
  const pts = phase.points;
  if (pts.length === 0) return null;
  const lastIdx = pts.length - 1;
  let scX: number;
  let scY: number;
  let scZ: number;
  if (lastIdx === 0) {
    // Single-point phase — the interpolation collapses; just return
    // that point (with the optional Moon-frame shift applied below).
    scX = pts[0].x;
    scY = pts[0].y;
    scZ = pts[0].z;
  } else {
    // The fractional index (time-correct on a coast); floor for the segment start, frac for
    // the interpolation.
    const f = phaseIndexAt(phase, phaseProgress);
    const i = Math.min(lastIdx - 1, Math.max(0, Math.floor(f)));
    const frac = f - i;
    const pa = pts[i];
    const pb = pts[i + 1];
    scX = pa.x + (pb.x - pa.x) * frac;
    scY = pa.y + (pb.y - pa.y) * frac;
    scZ = pa.z + (pb.z - pa.z) * frac;
  }
  if (frame && MOON_LOCAL_PHASE_TYPES.has(phase.type)) {
    scX += frame.moonPos.x - frame.moonRefPos.x;
    scY += frame.moonPos.y - frame.moonRefPos.y;
    scZ += frame.moonPos.z - frame.moonRefPos.z;
  }
  return { x: scX, y: scY, z: scZ };
}
