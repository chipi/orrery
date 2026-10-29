/**
 * `$lib/orbital` — pure orbital + camera math for `/fly`, no Three.js, no DOM.
 * What each file owns is in this folder's README.md; the physics quantities
 * themselves live in `$lib/physics` (e.g. Kepler propagation in
 * `physics/transfer/orbital.ts`).
 *
 * This barrel re-exports only the flyby-camera-plan API (camera positioning,
 * camera-frame projection, shot-quality classifier); the other modules here
 * are imported by path.
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
