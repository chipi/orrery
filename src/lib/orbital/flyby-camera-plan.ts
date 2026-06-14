/**
 * Pure math for the /fly iconic-shot camera plan. Given a flyby
 * context (planet pos, ship trajectory samples, peak day, current sim
 * day), returns the camera position + orientation that produces the
 * "Cassini mission-art" hero composition: spacecraft as foreground at
 * 3/4 angle, planet looming behind, never with the ship occluded.
 *
 * This module is consumed by BOTH the 3D scene (real-time render) and
 * the 2D Canvas debug viewer (`$lib/components/FlybyDebugViewer.svelte`).
 * The same input → same output, so we can SEE the math in the 2D
 * viewer and trust the 3D scene will compose the same way.
 *
 * No Three.js. No DOM. Pure functions over plain data. Easy to test.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrajectorySample {
  /** Mission-elapsed time (days since launch). */
  met: number;
  /** Scene-space position (AU × SCALE_3D, with +y offset for flybys). */
  pos: Vec3;
}

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'arrokoth'
  | 'ceres'
  | 'vesta'
  | 'psyche'
  | 'bennu'
  | 'halley'
  | '67p'
  | 'itokawa'
  | 'didymos'
  | 'dimorphos'
  | 'donaldjohanson'
  | 'eurybates'
  | 'polymele'
  | 'leucus'
  | 'orus'
  | 'patroclus'
  | 'menoetius';

/**
 * Per-planet camera tuning. Adjust here to change the iconic
 * composition for a specific planet without touching the math.
 * Saturn-OI has its own override layer (camera.up roll) handled
 * outside this module.
 *
 * IMPORTANT (semantics): in the v2 math (planet-centric), the camera
 * is positioned RELATIVE TO THE PLANET, not the ship — because the
 * Orrery flyby trajectory data clusters ship waypoints around the
 * planet (ship.xz ≈ planet.xz within a few days of peak). Anchoring
 * the camera to the planet lets sideAngle actually move the camera
 * off the ship-planet collinear axis, so the ship reads as an
 * off-center foreground accent against a planet-dominated frame.
 */
export interface PlanetComposition {
  /** Camera distance from the PLANET center (not ship), as a multiple
   *  of the planet's scene-render radius. Bigger = planet smaller in
   *  frame, ship still visible-ish if not too tiny. 3–5 is typical. */
  camRMultiplier: number;
  /** Lateral rotation off the "directly-behind-ship-approach" axis
   *  around the planet. 0 = camera lies on the ship-approach line
   *  behind the ship (ship in front of planet, collinear → bad);
   *  π/3 (60°) = camera 60° off to one side → ship projects to ~60°
   *  off frame center → classic 3/4 over-the-shoulder Cassini-art.
   *  Positive sign rotates CCW in xz. */
  sideAngleRad: number;
  /** Camera elevation above the orbital plane (xz), measured from
   *  the plane upward: 0 = camera at planet's altitude looking
   *  horizontally; π/2 = camera directly above planet looking down.
   *  Cassini-art is typically 0.35–0.6 rad (20–35° above plane). */
  pitchRad: number;
  /** Days before peak to FREEZE the iconic moment. Closest approach
   *  itself is at peak; at peak the ship is inside the planet's
   *  render volume. With the v2 planet-centric math, lead-days
   *  controls where on the approach arc we sample the ship — small
   *  values (2–6) put ship near planet limb; larger values (10–30)
   *  pull ship further from planet, but trajectory data may not
   *  separate it much in xz. */
  iconicLeadDays: number;
  /** Where the camera LOOKS, expressed as a lerp from planet→ship:
   *  0 = look at planet center (planet dominates frame center,
   *  ship reads as off-center accent — Cassini-art);
   *  1 = look at ship (ship at frame center, planet behind it);
   *  0 is the right default for hero flyby shots. */
  targetBias: number;
}

// v2 defaults validated in the 2D viewer against Cassini's Venus #1
// flyby on 2026-06-12. Sweet spot: side ≈ 85° (near-perpendicular to
// the ship-approach axis), pitch ≈ 20° (slight elevation), lead = 1d
// (ship at max +y above orbital plane → cleanest separation), camR
// 3.5–4.5·r so planet dominates center, look bias = 0 (planet at
// frame center). Outer planets get larger camR + lead because their
// +y lift is proportionally smaller relative to scene scale.
const ICONIC_SIDE = (85 * Math.PI) / 180;
const ICONIC_PITCH = (20 * Math.PI) / 180;
export const PLANET_COMPOSITION: Record<PlanetId, PlanetComposition> = {
  mercury: {
    camRMultiplier: 3.5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 1,
    targetBias: 0,
  },
  venus: {
    camRMultiplier: 3.5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 1,
    targetBias: 0,
  },
  earth: {
    camRMultiplier: 3.2,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 1,
    targetBias: 0,
  },
  mars: {
    camRMultiplier: 3.5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 1,
    targetBias: 0,
  },
  jupiter: {
    camRMultiplier: 4,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  saturn: {
    // Saturn pitch is intentionally shallow (≈18° above the orbital
    // plane vs the default 20°) so the camera reads close to the
    // ring plane — Wernquist's Grand Finale art keeps the camera near
    // ring-plane-edge-on so the rings register as a flat slice across
    // the frame. Pairs with the 17° camera.up roll applied inline at
    // /fly's render block. Pre-v2 this was a `targetP = 1.25` override
    // inside the /fly cinema loop; absorbed here so PLANET_COMPOSITION
    // is the single source of truth for camera framing.
    camRMultiplier: 4.5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: 0.32,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  uranus: {
    camRMultiplier: 4,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  neptune: {
    camRMultiplier: 4,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  // Pluto — New Horizons' July 2015 encounter. Render radius is 0.9
  // (smallest in PLANET_SIZES), so a 5× camR multiplier puts the
  // camera ~4.5 scene units off the body — close enough that Pluto's
  // heart-shaped Sputnik Planitia would dominate the frame if the
  // mesh carried a texture. Lead-days bumped to 3 because the
  // trajectory data at 39 AU is sparser than inner-system flybys, so
  // a longer lead-time pulls the ship further from the body in xz.
  pluto: {
    camRMultiplier: 5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 3,
    targetBias: 0,
  },
  // Arrokoth — NH 2019 Kuiper-Belt flyby. Render radius is only 0.5
  // (smaller even than Pluto), so a 6× camR multiplier puts the
  // camera close enough that the snowman contact-binary shape would
  // dominate frame — matching the canonical NH Arrokoth release shot.
  // Lead-days 2 is shorter than Pluto's 3 because the encounter is
  // briefer (NH zipped past at 14 km/s, less than 16 minutes of
  // close-approach window vs Pluto's hours-long pass).
  arrokoth: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  // Asteroid hero shots. Small bodies need tighter camR multipliers
  // so the disc actually fills the frame — at camR 4× a 0.6 unit
  // body sits at 2.4 units distance, fine; smaller bodies need 5-6×
  // to keep the silhouette readable. iconicLeadDays 2 matches the
  // outer-system tier (sparser trajectory sampling).
  ceres: {
    camRMultiplier: 5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  vesta: {
    camRMultiplier: 5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  psyche: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  bennu: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  // Comet hero shots. Halley (Giotto 1986) at ~600 km closest
  // approach; 67P (Rosetta 2014) at a few km during the multi-year
  // rendezvous. Both bodies are tiny, so tight camR (6×) to give
  // them visual presence. Lead-days 2 — flyby speeds are high so
  // there's no holding window like the Apollo orbit.
  halley: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  '67p': {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  // #341 Batch 5 — small bodies. Tight camR (6×) puts the camera
  // close enough to give sub-km-class bodies frame presence.
  // iconicLeadDays varies by encounter speed: Hayabusa/Itokawa was
  // station-keeping (slow), so lead 3 pulls ship further away in xz;
  // DART/Dimorphos was 6.14 km/s closing impact, lead 1 keeps ship
  // close to the body at the impact moment; Lucy Trojans are
  // multi-km/s flybys, lead 2.
  itokawa: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 3,
    targetBias: 0,
  },
  didymos: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 1,
    targetBias: 0,
  },
  // Dimorphos is the impact target — camera frames Dimorphos with
  // Didymos as background context body. targetBias 0.2 nudges the
  // composition slightly toward the ship so the moonlet doesn't
  // disappear under the parent's frame footprint.
  dimorphos: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 0.5,
    targetBias: 0.2,
  },
  donaldjohanson: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  eurybates: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  polymele: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  leucus: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  orus: {
    camRMultiplier: 6,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  // Patroclus + Menoetius is the binary climax — slightly looser camR
  // so both bodies of the binary read in frame.
  patroclus: {
    camRMultiplier: 5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
  menoetius: {
    camRMultiplier: 5,
    sideAngleRad: ICONIC_SIDE,
    pitchRad: ICONIC_PITCH,
    iconicLeadDays: 2,
    targetBias: 0,
  },
};

export interface FlybyContext {
  planetId: PlanetId;
  /** Planet's scene-space xz position at peak day. */
  planetPos: { x: number; z: number };
  /** Planet's scene-space render radius (visual sphere radius). */
  planetRadius: number;
  /** Ship's predicted scene-space position at a given met. The math
   *  layer calls this to sample positions; the caller provides the
   *  interpolation strategy (linear, spline, etc.). */
  shipPosAtMet: (met: number) => Vec3 | null;
  /** Peak day (closest approach) in mission-elapsed time. */
  peakMet: number;
  /** Optional override for the per-planet composition. Useful for
   *  testing tuning changes without editing PLANET_COMPOSITION. */
  composition?: PlanetComposition;
}

export interface IconicShotPlan {
  /** Time we freeze on (peakMet − iconicLeadDays). */
  iconicMet: number;
  /** Ship's predicted position at the iconic moment. */
  shipPos: Vec3;
  /** Ship's velocity direction in xz plane (unit vector). The camera
   *  is positioned at a rotation off the REVERSE of this. */
  shipVelocityXZ: { x: number; z: number };
  /** Computed camera position in scene space. The render pipeline
   *  places the camera here and lookAt's cameraTarget. */
  cameraPos: Vec3;
  /** Where the camera looks. For the iconic shot this is the ship's
   *  position (so the ship sits at frame center). */
  cameraTarget: Vec3;
  /** Effective composition used (defaults from PLANET_COMPOSITION or
   *  the override). Returned so the viewer can label which values
   *  produced this frame. */
  composition: PlanetComposition;
}

/**
 * Plan the iconic-shot camera state for a flyby (v2 planet-centric).
 *
 * Why planet-centric: in Orrery's stylized trajectory data, the ship
 * waypoint AT a flyby coincides with the planet position, and adjacent
 * waypoints are interpolated through the same vicinity — so ship.xz ≈
 * planet.xz for ±many days around peakMet. If the camera were anchored
 * to the ship and rotated around ship-velocity (as v1 did), every
 * rotation kept the ship-planet pair collinear from the camera POV
 * and the ship always projected ON TOP of the planet disk.
 *
 * Algorithm:
 *  1. Resolve composition (per-planet defaults or override).
 *  2. Compute iconic moment = peakMet − iconicLeadDays.
 *  3. Sample ship at iconic moment + 1 day earlier for approach direction.
 *  4. Build two basis vectors in the orbital (xz) plane:
 *        approachUnit = unit vector of (ship − shipPrev), the heliocentric
 *                       direction the ship is moving in;
 *        perpUnit     = approachUnit rotated +90° in xz (CCW around +y).
 *  5. Camera distance = planetRadius × camRMultiplier (from PLANET center).
 *  6. Camera position = planet + (−approachUnit · cos(pitch) · cos(side)
 *                                + perpUnit     · cos(pitch) · sin(side)
 *                                + worldUp      · sin(pitch)) · camDist.
 *     side = 0 → camera dead behind ship (worst case, collinear);
 *     side = π/2 → camera perpendicular to ship-approach line (best
 *                  separation of ship and planet in frame);
 *     pitch = 0 → camera at planet's altitude (orbital plane); pitch =
 *                 π/2 → camera directly above planet (top-down).
 *  7. cameraTarget = lerp(planet, ship, targetBias).
 *     bias = 0 → look at planet (planet at frame center, ship off-center
 *                — Cassini-art);
 *     bias = 1 → look at ship.
 */
export function planFlybyShot(ctx: FlybyContext): IconicShotPlan | null {
  const composition = ctx.composition ?? PLANET_COMPOSITION[ctx.planetId];
  const iconicMet = Math.max(0, ctx.peakMet - composition.iconicLeadDays);
  const shipPos = ctx.shipPosAtMet(iconicMet);
  if (!shipPos) return null;
  // Sample 1 day before for approach direction.
  const shipPrev = ctx.shipPosAtMet(Math.max(0, iconicMet - 1));
  if (!shipPrev) return null;
  const velX = shipPos.x - shipPrev.x;
  const velZ = shipPos.z - shipPrev.z;
  const velMag = Math.hypot(velX, velZ);
  if (velMag < 1e-6) {
    return null;
  }
  const approachX = velX / velMag;
  const approachZ = velZ / velMag;
  // Perpendicular to approach in xz, rotated +90° CCW around +y:
  //   (vx, _, vz) rotated 90° CCW → (-vz, _, vx)
  let perpX = -approachZ;
  let perpZ = approachX;
  // Sun-lit-side bias: at side-angle 85° the camera sits almost
  // entirely on the perp axis, so the angle α between perp and the
  // sun-from-planet vector decides how much lit hemisphere ends up
  // facing camera (α=0° → 100% lit disc, α=90° → terminator-grazing,
  // α=180° → 100% night disc with only a thin lit limb). Pre-fix
  // V2 Jupiter showed α≈170° → ugly thin-lit-limb shot. But V2 Uranus
  // showed α≈80° → iconic terminator composition (the actual Voyager
  // 2 Uranus photograph). We want to flip ONLY when α is DEEP into
  // the night side, not just past terminator. Threshold cos(α) < -0.7
  // corresponds to α > 134°, which catches Jupiter-style "thin-limb"
  // framings while preserving terminator-grazing shots like Voyager
  // 2 Uranus (α≈80°) and Cassini Saturn (varies by approach).
  const sunDist = Math.hypot(ctx.planetPos.x, ctx.planetPos.z);
  if (sunDist > 1e-6) {
    const sunDirX = -ctx.planetPos.x / sunDist;
    const sunDirZ = -ctx.planetPos.z / sunDist;
    const cosAlpha = perpX * sunDirX + perpZ * sunDirZ;
    if (cosAlpha < -0.7) {
      perpX = -perpX;
      perpZ = -perpZ;
    }
  }

  const camDist = ctx.planetRadius * composition.camRMultiplier;
  const cosPitch = Math.cos(composition.pitchRad);
  const sinPitch = Math.sin(composition.pitchRad);
  const cosSide = Math.cos(composition.sideAngleRad);
  const sinSide = Math.sin(composition.sideAngleRad);
  // Camera position around the planet:
  //   xz-plane component: cos(pitch) along the planet's orbital plane
  //     · cos(side) toward "behind-the-ship-approach" (-approachUnit)
  //     · sin(side) along the perp axis (perpUnit)
  //   y component: sin(pitch) up
  const camOffsetX = camDist * cosPitch * (-approachX * cosSide + perpX * sinSide);
  const camOffsetZ = camDist * cosPitch * (-approachZ * cosSide + perpZ * sinSide);
  const camOffsetY = camDist * sinPitch;
  const cameraPos: Vec3 = {
    x: ctx.planetPos.x + camOffsetX,
    y: camOffsetY, // planet center sits at y=0 in scene space
    z: ctx.planetPos.z + camOffsetZ,
  };
  // Camera target lerps from planet (bias=0) toward ship (bias=1).
  const bias = Math.max(0, Math.min(1, composition.targetBias));
  const cameraTarget: Vec3 = {
    x: ctx.planetPos.x + (shipPos.x - ctx.planetPos.x) * bias,
    y: shipPos.y * bias, // planet's y is 0
    z: ctx.planetPos.z + (shipPos.z - ctx.planetPos.z) * bias,
  };
  return {
    iconicMet,
    shipPos,
    shipVelocityXZ: { x: approachX, z: approachZ },
    cameraPos,
    cameraTarget,
    composition,
  };
}

/**
 * Project a world-space point onto the camera's image plane for the
 * debug-viewer frame mock-up. Returns `null` if the point is behind
 * the camera. Uses a Three.js-style perspective camera with vertical
 * field-of-view `fovDeg` (Three.js default is 50°). `worldUp` defaults
 * to (0, 1, 0); we ignore the Saturn-OI roll override at this layer.
 *
 * Output coords are in "tan-half-FOV" units — i.e. the visible frame
 * spans y ∈ [−tan(fovDeg/2), +tan(fovDeg/2)]; x range scales by aspect.
 * Multiply by `canvasHeight / (2 · tan(fovDeg/2))` to get pixel y.
 *
 * `apparentRadius` is the projected angular radius of a sphere of
 * `worldRadius` at the same depth — also in tan-half-FOV units.
 *
 * `depth` is the dot of (point − camera) with the camera-forward
 * direction. depth < 0 means behind camera; depth = 0 means at the
 * lens. Use it to determine occlusion order (smaller depth = closer
 * to camera = drawn over deeper objects).
 */
export interface CameraFrameProjection {
  /** x in tan-half-FOV units (positive = right of frame center). */
  x: number;
  /** y in tan-half-FOV units (positive = up in frame). */
  y: number;
  /** Depth along camera-forward axis. */
  depth: number;
  /** Projected angular radius (tan-half-FOV units) for sphere of given world radius. */
  apparentRadius: number;
}

export function projectToCameraFrame(
  point: Vec3,
  worldRadius: number,
  cameraPos: Vec3,
  cameraTarget: Vec3,
  // FOV is signature-only — the projection returns tan-half-FOV units so
  // it's FOV-agnostic. Kept on the signature so the call sites read as
  // "project at FOV X" alongside classifyShot, which DOES use FOV.
  _fovDeg = 50,
): CameraFrameProjection | null {
  const fx = cameraTarget.x - cameraPos.x;
  const fy = cameraTarget.y - cameraPos.y;
  const fz = cameraTarget.z - cameraPos.z;
  const fMag = Math.hypot(fx, fy, fz);
  if (fMag < 1e-9) return null;
  const forwardX = fx / fMag;
  const forwardY = fy / fMag;
  const forwardZ = fz / fMag;

  // right = forward × worldUp; worldUp = (0,1,0)
  // (a,b,c) × (0,1,0) = (c·0 − a·1, ... wait, use proper formula:
  // (a,b,c) × (0,1,0) = (b·0 − c·1, c·0 − a·0, a·1 − b·0) = (−c, 0, a)
  let rightX = -forwardZ;
  const rightY = 0;
  let rightZ = forwardX;
  const rMag = Math.hypot(rightX, rightY, rightZ);
  if (rMag < 1e-9) {
    // Camera looking straight up or down; pick an arbitrary right.
    rightX = 1;
    rightZ = 0;
  } else {
    rightX /= rMag;
    rightZ /= rMag;
  }
  // up = right × forward
  const upX = rightY * forwardZ - rightZ * forwardY;
  const upY = rightZ * forwardX - rightX * forwardZ;
  const upZ = rightX * forwardY - rightY * forwardX;

  const dx = point.x - cameraPos.x;
  const dy = point.y - cameraPos.y;
  const dz = point.z - cameraPos.z;
  const depth = dx * forwardX + dy * forwardY + dz * forwardZ;
  if (depth <= 0) return null;
  const xWorld = dx * rightX + dy * rightY + dz * rightZ;
  const yWorld = dx * upX + dy * upY + dz * upZ;
  return {
    x: xWorld / depth,
    y: yWorld / depth,
    depth,
    apparentRadius: worldRadius / depth,
  };
}

/**
 * Shot-quality classifier for a flyby plan. Given a plan + planet pos +
 * ship visible radius, returns whether the shot is iconic, plus the
 * named failure modes so the viewer can surface them.
 *
 * Iconic ⇔ (ship in front of planet) AND (ship and planet both inside
 * a 1.0 tan-half-FOV frame at FOV) AND (planet apparent size ≥ ship
 * apparent size × 2) AND (ship not so tiny it disappears).
 */
export interface ShotQuality {
  isIconic: boolean;
  shipBehindPlanet: boolean;
  shipOutOfFrame: boolean;
  planetOutOfFrame: boolean;
  planetTooSmall: boolean;
  shipTooTiny: boolean;
  /** Ship's projected center sits inside the planet's projected disk
   *  in the camera frame → composition collapses to "ship at planet's
   *  limb / floating over disk", not the foreground/background
   *  separation Cassini-art requires. */
  shipInsidePlanetDisk: boolean;
  shipDepth: number;
  planetDepth: number;
  shipApparent: number;
  planetApparent: number;
  /** Distance between ship and planet centers in the camera frame
   *  (tan-half-FOV units). */
  shipPlanetFrameSeparation: number;
  /** Lateral distance from planet center to ship-camera axis (world units). */
  planetLateralFromViewAxis: number;
}

export function classifyShot(
  plan: IconicShotPlan,
  planetPos: Vec3,
  planetRadius: number,
  shipVisibleRadius: number,
  fovDeg = 50,
): ShotQuality {
  const tanHalfFov = Math.tan((fovDeg * Math.PI) / 360);
  const shipProj = projectToCameraFrame(
    plan.shipPos,
    shipVisibleRadius,
    plan.cameraPos,
    plan.cameraTarget,
    fovDeg,
  );
  const planetProj = projectToCameraFrame(
    planetPos,
    planetRadius,
    plan.cameraPos,
    plan.cameraTarget,
    fovDeg,
  );
  const shipDepth = shipProj?.depth ?? Infinity;
  const planetDepth = planetProj?.depth ?? Infinity;
  const shipApparent = shipProj?.apparentRadius ?? 0;
  const planetApparent = planetProj?.apparentRadius ?? 0;

  // Lateral offset of planet from view axis (in world units, at planet's depth)
  const fx = plan.cameraTarget.x - plan.cameraPos.x;
  const fy = plan.cameraTarget.y - plan.cameraPos.y;
  const fz = plan.cameraTarget.z - plan.cameraPos.z;
  const fMag = Math.hypot(fx, fy, fz);
  let lateralFromAxis = Infinity;
  if (fMag > 1e-9) {
    const ux = fx / fMag;
    const uy = fy / fMag;
    const uz = fz / fMag;
    const px = planetPos.x - plan.cameraPos.x;
    const py = planetPos.y - plan.cameraPos.y;
    const pz = planetPos.z - plan.cameraPos.z;
    const along = px * ux + py * uy + pz * uz;
    const offX = px - along * ux;
    const offY = py - along * uy;
    const offZ = pz - along * uz;
    lateralFromAxis = Math.hypot(offX, offY, offZ);
  }

  // Ship is behind planet (visually occluded) when:
  //   - planet is between camera and ship (planetDepth < shipDepth)
  //   - lateral offset of planet from view axis < planetRadius
  const shipBehindPlanet = planetDepth < shipDepth && lateralFromAxis < planetRadius;
  const shipOutOfFrame =
    !shipProj || Math.abs(shipProj.x) > tanHalfFov || Math.abs(shipProj.y) > tanHalfFov;
  const planetOutOfFrame =
    !planetProj ||
    Math.abs(planetProj.x) - planetApparent > tanHalfFov ||
    Math.abs(planetProj.y) - planetApparent > tanHalfFov;
  const planetTooSmall = planetApparent < shipApparent * 2;
  // "ship too tiny" — ship apparent angular radius < 0.5% of frame
  // (i.e. ≤ ~3 px in a 720-px frame). Below this it just disappears.
  const shipTooTiny = shipApparent < tanHalfFov * 0.005;

  // Frame-space separation of ship and planet centers.
  let shipPlanetFrameSeparation = Infinity;
  if (shipProj && planetProj) {
    const dxF = shipProj.x - planetProj.x;
    const dyF = shipProj.y - planetProj.y;
    shipPlanetFrameSeparation = Math.hypot(dxF, dyF);
  }
  // Ship inside planet's projected disk → composition collapses.
  // Require ship to be at least 1.05× the planet's projected radius
  // away from planet center in the frame (≥5% clearance).
  const shipInsidePlanetDisk =
    shipProj !== null && planetProj !== null && shipPlanetFrameSeparation < planetApparent * 1.05;

  const isIconic =
    !shipBehindPlanet &&
    !shipOutOfFrame &&
    !planetOutOfFrame &&
    !planetTooSmall &&
    !shipTooTiny &&
    !shipInsidePlanetDisk;
  return {
    isIconic,
    shipBehindPlanet,
    shipOutOfFrame,
    planetOutOfFrame,
    planetTooSmall,
    shipTooTiny,
    shipInsidePlanetDisk,
    shipDepth,
    planetDepth,
    shipApparent,
    planetApparent,
    shipPlanetFrameSeparation,
    planetLateralFromViewAxis: lateralFromAxis,
  };
}

/**
 * Helper for the 2D debug viewer — compute the "behind-ship" reference
 * direction and the camera direction at the side angle, so we can draw
 * both as guide arrows in the chart. Same math as inside planFlybyShot
 * but exposed for visualization.
 */
export function flybyCameraGuides(
  velocityXZ: { x: number; z: number },
  sideAngleRad: number,
): {
  behind: { x: number; z: number };
  cameraDir: { x: number; z: number };
} {
  const mag = Math.hypot(velocityXZ.x, velocityXZ.z);
  if (mag < 1e-6) {
    return { behind: { x: 0, z: 0 }, cameraDir: { x: 0, z: 0 } };
  }
  const vx = velocityXZ.x / mag;
  const vz = velocityXZ.z / mag;
  const behindX = -vx;
  const behindZ = -vz;
  const cs = Math.cos(sideAngleRad);
  const sn = Math.sin(sideAngleRad);
  return {
    behind: { x: behindX, z: behindZ },
    cameraDir: {
      x: behindX * cs - behindZ * sn,
      z: behindX * sn + behindZ * cs,
    },
  };
}
