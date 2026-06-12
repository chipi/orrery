/**
 * Pure projection helpers for placing cislunar phase markers on screen
 * (GH #107 prep for /fly commit 5). Two render paths are covered:
 *
 *   - 3D scene: ECI km → scene units → CSS pixels via Three.js camera
 *   - 2D canvas: ECI km → canvas pixels via the Earth-centred Moon-mode
 *     projection used by draw2d in /fly
 *
 * Isolating these as pure functions lets us unit-test the math
 * without spinning up Three.js or the 2D canvas, and keeps /fly's
 * +page.svelte free of inline projection arithmetic.
 *
 * All helpers return `{ x, y, onScreen }` where:
 *   - x, y are CSS pixels relative to the canvas top-left
 *   - onScreen is `true` iff the point is in the camera's frustum AND
 *     the pixel falls inside the canvas. Callers can use it to gate
 *     marker visibility (off-screen markers should be hidden, not
 *     clamped to the edge).
 *
 * SCALE_CISLUNAR is the same constant /fly uses (1/10000 — 1 km maps
 * to 0.0001 scene units, putting the Earth-Moon distance at 38.44
 * scene units). Exposed here so callers don't repeat the magic number.
 */

import { AU_TO_KM } from '../../orbital';
import type { Vec3Km } from './cislunar-geometry';
import type { Vec3Au } from '$lib/interplanetary-geometry';

/** Scene-unit scaling for the Earth-centred cislunar view (ADR-058). */
export const SCALE_CISLUNAR = 1 / 10000;

export interface ScreenPoint {
  x: number;
  y: number;
  /** True iff the point is in the camera frustum AND inside canvas bounds. */
  onScreen: boolean;
}

/**
 * ECI km → 3D scene units. Pure scalar multiply per axis. Useful when
 * building Three.js Vector3 positions for marker meshes / sprites.
 */
export function eciKmToSceneUnits(pt: Vec3Km): Vec3Km {
  return {
    x: pt.x * SCALE_CISLUNAR,
    y: pt.y * SCALE_CISLUNAR,
    z: pt.z * SCALE_CISLUNAR,
  };
}

/**
 * Project a point in scene units to CSS pixels via the camera. The
 * `camera` parameter is typed loosely (`{ project: ... }`) so this is
 * easy to mock in unit tests; pass a real `THREE.Camera` at runtime.
 *
 * Returns onScreen=false when the point is behind the camera (NDC.z
 * outside [-1, 1]) OR the pixel falls outside the canvas. Callers
 * should hide markers when onScreen=false rather than clamping.
 *
 * The mockable shape: any object with a `project(camera)` method that
 * mutates a Vector3-like {x, y, z} to NDC space.
 */
export interface MinimalVector3 {
  x: number;
  y: number;
  z: number;
}
export interface MinimalCamera {
  /** A Three.js Camera at runtime; loose typing for testability. */
  readonly type: string;
}
export interface MinimalProjector {
  /** Projects (x, y, z) scene units into (x, y, z) NDC, in-place. */
  project(camera: MinimalCamera): MinimalVector3;
}

export function sceneToScreenPx(
  sceneVec: MinimalProjector,
  camera: MinimalCamera,
  canvasWidth: number,
  canvasHeight: number,
): ScreenPoint {
  const ndc = sceneVec.project(camera);
  const pxX = ((ndc.x + 1) / 2) * canvasWidth;
  const pxY = ((1 - ndc.y) / 2) * canvasHeight;
  const inFrustum = ndc.z >= -1 && ndc.z <= 1;
  const inCanvas = pxX >= 0 && pxX <= canvasWidth && pxY >= 0 && pxY <= canvasHeight;
  return { x: pxX, y: pxY, onScreen: inFrustum && inCanvas };
}

/**
 * One-shot: ECI km → CSS pixels via a Three.js camera. Wraps
 * eciKmToSceneUnits + sceneToScreenPx using a caller-provided Vector3
 * factory (so we don't import THREE here — keeps this module
 * test-pure). At runtime, /fly passes `new THREE.Vector3()`.
 */
export function eciKmToScreenPx(
  pt: Vec3Km,
  vec3Factory: (x: number, y: number, z: number) => MinimalProjector,
  camera: MinimalCamera,
  canvasWidth: number,
  canvasHeight: number,
): ScreenPoint {
  const scene = eciKmToSceneUnits(pt);
  return sceneToScreenPx(vec3Factory(scene.x, scene.y, scene.z), camera, canvasWidth, canvasHeight);
}

/**
 * 2D canvas projection for the Earth-centred Moon-mode view used by
 * /fly's `draw2d`. Earth sits at (cx, cy); ECI km axes map directly to
 * canvas pixels via the Moon-mode SCALE_2D = BASE_SCALE_2D × 6.
 *
 * `baseScale2d` is the Mars-mode pixels-per-AU constant /fly already
 * computes from canvas dimensions (`Math.min(W, H) / 4`); we multiply
 * by 6 internally so the caller can pass the unscaled value.
 *
 * onScreen is true iff the resulting pixel falls inside the canvas
 * (no behind-camera concept in 2D).
 */
export interface Canvas2dViewState {
  canvasWidth: number;
  canvasHeight: number;
  /** Mars-mode pixels-per-AU before the Moon-mode ×6 multiplier. */
  baseScale2dPerAu: number;
}

export function eciKmToCanvas2dPx(pt: Vec3Km, view: Canvas2dViewState): ScreenPoint {
  const cx = view.canvasWidth / 2;
  const cy = view.canvasHeight / 2;
  // Moon-mode is 6× the heliocentric SCALE_2D so the cislunar volume
  // fills the screen instead of vanishing at a pixel.
  const scalePerAu = view.baseScale2dPerAu * 6;
  // Cislunar 2D uses (x, z) of ECI as the plan view (y is ecliptic-
  // north out of the screen, matching the Moon's circular orbit plane
  // defined in cislunar-geometry).
  const xAu = pt.x / AU_TO_KM;
  const zAu = pt.z / AU_TO_KM;
  const x = cx + xAu * scalePerAu;
  const y = cy + zAu * scalePerAu;
  const onScreen = x >= 0 && x <= view.canvasWidth && y >= 0 && y <= view.canvasHeight;
  return { x, y, onScreen };
}

// ===========================================================================
// Heliocentric (interplanetary) projection helpers — #107 Step 6e.
// Mirror the cislunar set above but for Vec3Au coords (Sun at origin).
// /fly's existing heliocentric scene uses raw AU as scene units (no
// scaling), so helioAuToSceneUnits is the identity transform —
// retained as a function for symmetry with the cislunar API.
// ===========================================================================

/** AU → scene units. Identity for the heliocentric scene (1 AU = 1 unit).
 *  Vec3Au is owned by interplanetary-geometry.ts; imported here for
 *  the projection signatures (same pattern as Vec3Km from
 *  cislunar-geometry.ts). */
export function helioAuToSceneUnits(pt: Vec3Au): Vec3Au {
  return { x: pt.x, y: pt.y, z: pt.z };
}

/** One-shot: helio AU → CSS pixels via a Three.js camera. Wraps
 *  helioAuToSceneUnits + sceneToScreenPx using a caller-provided
 *  Vector3 factory. */
export function helioAuToScreenPx(
  pt: Vec3Au,
  vec3Factory: (x: number, y: number, z: number) => MinimalProjector,
  camera: MinimalCamera,
  canvasWidth: number,
  canvasHeight: number,
): ScreenPoint {
  const scene = helioAuToSceneUnits(pt);
  return sceneToScreenPx(vec3Factory(scene.x, scene.y, scene.z), camera, canvasWidth, canvasHeight);
}

/** Heliocentric 2D canvas projection — Sun at canvas centre, x/z in AU.
 *  Uses the unscaled BASE_SCALE_2D (no Moon-mode ×6 multiplier — the
 *  heliocentric volume already fits via the larger SCALE constant). */
export function helioAuToCanvas2dPx(pt: Vec3Au, view: Canvas2dViewState): ScreenPoint {
  const cx = view.canvasWidth / 2;
  const cy = view.canvasHeight / 2;
  const scalePerAu = view.baseScale2dPerAu;
  const x = cx + pt.x * scalePerAu;
  const y = cy + pt.z * scalePerAu;
  const onScreen = x >= 0 && x <= view.canvasWidth && y >= 0 && y <= view.canvasHeight;
  return { x, y, onScreen };
}
