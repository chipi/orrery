/**
 * `$lib/orbital` — pure orbital + camera math, no Three.js, no DOM.
 *
 * Per the post-#332 punch list (issue #332 comments §1), this folder is the
 * landing zone for the "2D-debug helper / orbital math extraction" — Kepler
 * propagation, spacecraft position, camera position, and screen projection
 * live here as pure functions so the math is verifiable without spinning
 * up the 3D stack.
 *
 * Today: only the flyby-camera-plan module (camera positioning + camera-frame
 * projection + shot-quality classifier) lives here, lifted out of `$lib/three/`
 * which it never actually depended on. Future moves:
 *  - `mission-arc.ts` (heliocentric Kepler + spacecraft propagation)
 *  - `orbital.ts`     (vis-viva, MU_SUN, AU constants)
 *  - any per-route 2D-debug surface that the FlybyDebugViewer pattern
 *    generalises into.
 *
 * Barrel re-export so call sites read as `$lib/orbital` instead of pinning
 * to individual file paths.
 */

export {
  planFlybyShot,
  projectToCameraFrame,
  classifyShot,
  flybyCameraGuides,
  PLANET_COMPOSITION,
} from './flyby-camera-plan';
export type {
  Vec3,
  TrajectorySample,
  PlanetId,
  PlanetComposition,
  FlybyContext,
  IconicShotPlan,
  CameraFrameProjection,
  ShotQuality,
} from './flyby-camera-plan';
