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
    // Clamp progress to [0, lastIdx]; floor for the segment start,
    // frac for the interpolation.
    const f = Math.max(0, Math.min(lastIdx, phaseProgress * lastIdx));
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
