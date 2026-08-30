import { R_EARTH_KM } from '$lib/orbital/cislunar/cislunar-geometry';
import type { Vec2 } from '$lib/physics/transfer/mission-arc';

/**
 * Pure per-frame coast-preview geometry builders for /fly (RFC-036 WS-B/B4).
 *
 * Two "engine-off coast" previews live in the `onFrame` body: the heliocentric one
 * forward-walks the committed spline (`outPts`), and the cislunar one numerically
 * integrates the spacecraft's Earth-centric state under two-body gravity. Both
 * produce a `Float32Array` of scaled scene positions; the frame body only does the
 * `BufferGeometry` swap. Extracting the computation makes the integrator (the
 * numerically-interesting part) unit-testable. Byte-identical to the inline code —
 * same constants, same Euler step, same collision cutoff.
 */

/**
 * Heliocentric coast preview: forward-walk `outPts` from the current mission
 * fraction `t` (0→1) to the arc terminus, scaled by `scale` (SCALE_3D). Returns the
 * scene-space position buffer. Shows the committed planned path (not a Keplerian
 * conic, which diverges from the multi-waypoint spline at gravity assists).
 */
export function sampleForwardArc(outPts: Vec2[], t: number, scale: number): Float32Array {
  const clamped = Math.max(0, Math.min(1, t));
  const startIdx = Math.floor(clamped * (outPts.length - 1));
  const samples = outPts.length - startIdx;
  const scenePositions = new Float32Array(samples * 3);
  for (let i = 0; i < samples; i++) {
    const p = outPts[startIdx + i];
    scenePositions[i * 3] = p.x * scale;
    scenePositions[i * 3 + 1] = (p.y ?? 0) * scale;
    scenePositions[i * 3 + 2] = p.z * scale;
  }
  return scenePositions;
}

/** Earth's gravitational parameter (km³/s²). */
const MU_EARTH = 398600.4418;
/** Integration steps × step-seconds → the preview horizon (200 × 600 s = ~33 h). */
const COAST_STEPS = 200;
const COAST_DT = 600;

/**
 * Cislunar coast preview: integrate the Earth-centric state `(p0, v)` forward under
 * two-body gravity (Moon gravity ignored — Tier-1 simplification, valid outside the
 * lunar SoI) via explicit Euler, dropping a point each step, scaled by
 * `scaleCislunar`. Stops early on Earth collision (`|r| < R_EARTH_KM`); the buffer
 * is still full length (trailing points stay at the last integrated position = 0).
 * Byte-identical to the inline integrator.
 */
export function integrateEarthCoastPreview(
  p0: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  scaleCislunar: number,
): Float32Array {
  let rx = p0.x;
  let ry = p0.y;
  let rz = p0.z;
  let rvx = v.x;
  let rvy = v.y;
  let rvz = v.z;
  const verts = new Float32Array((COAST_STEPS + 1) * 3);
  verts[0] = rx * scaleCislunar;
  verts[1] = ry * scaleCislunar;
  verts[2] = rz * scaleCislunar;
  for (let i = 1; i <= COAST_STEPS; i++) {
    const rMag = Math.hypot(rx, ry, rz);
    if (rMag < R_EARTH_KM) break; // collided
    const a = -MU_EARTH / (rMag * rMag * rMag);
    rvx += a * rx * COAST_DT;
    rvy += a * ry * COAST_DT;
    rvz += a * rz * COAST_DT;
    rx += rvx * COAST_DT;
    ry += rvy * COAST_DT;
    rz += rvz * COAST_DT;
    verts[i * 3] = rx * scaleCislunar;
    verts[i * 3 + 1] = ry * scaleCislunar;
    verts[i * 3 + 2] = rz * scaleCislunar;
  }
  return verts;
}
